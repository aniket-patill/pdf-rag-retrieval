"""
Views for the documents app.
"""
import os
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Document, DocumentChunk, QueryHistory, SearchHistory, Conversation, ChatMessage
from .serializers import (
    DocumentSerializer, DocumentSummarySerializer, QuerySerializer, 
    QueryResponseSerializer, SearchSerializer, SearchResultSerializer,
    QueryHistorySerializer, SearchHistorySerializer, ConversationSerializer, ChatMessageSerializer
)
from .services.pdf_service import PDFService
from .services.embedding_service import EmbeddingService
from .services.chromadb_service import ChromaDBService
from .services.gemini_service import GeminiService

import logging
logger = logging.getLogger(__name__)


# Initialize services
pdf_service = PDFService(settings.PDFS_PATH)
embedding_service = EmbeddingService()
chromadb_service = ChromaDBService(settings.CHROMADB_PATH)
gemini_service = GeminiService(settings.GEMINI_API_KEY)


@api_view(['GET'])
def list_documents(request):
    """List all documents with optional pagination."""
    documents = Document.objects.all()  # type: ignore
    
    # Pagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    result_page = paginator.paginate_queryset(documents, request)
    
    serializer = DocumentSerializer(result_page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
def get_document_summary(request, document_id):
    """Get or generate summary for a document."""
    try:
        document = get_object_or_404(Document, id=document_id)
        
        # If summary already exists and is recent, return it
        if document.summary and document.summary_generated_at:
            return Response({
                'summary': document.summary,
                'generated_at': document.summary_generated_at
            })
        
        # Generate new summary
        if not document.summary:
            # Get document text from chunks
            chunks = DocumentChunk.objects.filter(document=document).order_by('chunk_index')  # type: ignore
            if not chunks.exists():
                return Response(
                    {'error': 'Document not processed yet'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Combine chunks for summary
            full_text = " ".join([chunk.text for chunk in chunks])
            summary = gemini_service.generate_summary(full_text, document.title or document.filename)
            
            # Update document
            document.summary = summary
            document.summary_generated_at = timezone.now()
            document.save()
        
        return Response({
            'summary': document.summary,
            'generated_at': document.summary_generated_at
        })
        
    except Exception as e:
        logger.error(f"Error getting document summary: {str(e)}")
        return Response(
            {'error': 'Failed to generate summary'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def query_documents(request):
    """Answer user questions based on document context."""
    try:
        # For testing, we'll skip authentication temporarily
        clerk_user_id = getattr(request, 'clerk_user_id', 'anonymous')
        
        serializer = QuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        query = serializer.validated_data['query']  # type: ignore
        document_ids = serializer.validated_data.get('document_ids', [])  # type: ignore
        
        # Search for relevant chunks
        similar_chunks = chromadb_service.search_similar_chunks(
            query=query,
            n_results=10,
            document_ids=document_ids if document_ids else None
        )
        
        if not similar_chunks:
            return Response({
                'response': "I couldn't find relevant information to answer your question.",
                'sources': []
            })
        
        # Generate answer using Gemini
        result = gemini_service.search_and_answer(query, similar_chunks)
        
        # Augment sources with best-effort page number (1-based) for citations
        augmented_sources = []
        for src in result.get('sources', []):
            try:
                doc_id = src['document_id']
                chunk_idx = src['chunk_index']
                document = Document.objects.get(id=doc_id)  # type: ignore
                
                # Resolve full file path similar to serve_document_file
                if document.file_path.startswith('pdfs/') or document.file_path.startswith('pdfs\\'):
                    relative_path = document.file_path.replace('\\', os.sep).replace('/', os.sep)
                    full_path = os.path.join(settings.BASE_DIR, relative_path)
                else:
                    full_path = document.file_path
                
                # Match full chunk text when possible
                matched_chunk = next((c for c in similar_chunks 
                                      if c['metadata']['document_id'] == doc_id and 
                                         c['metadata']['chunk_index'] == chunk_idx), None)
                chunk_text = matched_chunk['text'] if matched_chunk else src.get('text_preview', '')
                pages = pdf_service.find_text_pages(full_path, chunk_text)
                page = pages[0] if pages else None
                augmented_sources.append({**src, 'page': page})
            except Document.DoesNotExist:  # type: ignore
                augmented_sources.append(src)
            except Exception as e:
                logger.error(f"Error augmenting source with page: {str(e)}")
                augmented_sources.append(src)
        
        # Save query history
        QueryHistory.objects.create(  # type: ignore
            clerk_user_id=clerk_user_id,
            query=query,
            response=result['answer'],
            document_ids=[chunk['metadata']['document_id'] for chunk in similar_chunks]
        )
        
        return Response({
            'answer': result['answer'],
            'sources': augmented_sources,
            'query': query
        })
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        return Response(
            {'error': 'Failed to process query'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def search_documents(request):
    """Search for documents and chunks based on query."""
    try:
        serializer = SearchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        query = serializer.validated_data['query']  # type: ignore
        limit = serializer.validated_data['limit']  # type: ignore
        
        # Search for similar chunks
        similar_chunks = chromadb_service.search_similar_chunks(
            query=query,
            n_results=limit
        )
        
        # Format results
        results = []
        for chunk in similar_chunks:
            try:
                document = Document.objects.get(id=chunk['metadata']['document_id'])  # type: ignore
                results.append({
                    'document': DocumentSerializer(document).data,
                    'score': chunk['score'],
                    'chunk_text': chunk['text'],
                    'chunk_index': chunk['metadata']['chunk_index']
                })
            except Document.DoesNotExist:  # type: ignore
                continue
        
        # Save search history if user is authenticated
        clerk_user_id = getattr(request, 'clerk_user_id', None)
        if clerk_user_id:
            SearchHistory.objects.create(  # type: ignore
                clerk_user_id=clerk_user_id,
                search_query=query,
                results_count=len(results)
            )
            logger.info(f"Saved search history for user {clerk_user_id}: {query}")
        
        return Response({
            'query': query,
            'results': results,
            'total': len(results)
        })
        
    except Exception as e:
        logger.error(f"Error searching documents: {str(e)}")
        return Response(
            {'error': 'Search failed'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_document_details(request, document_id):
    """Get detailed information about a specific document."""
    try:
        document = get_object_or_404(Document, id=document_id)
        serializer = DocumentSerializer(document)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Error getting document details: {str(e)}")
        return Response(
            {'error': 'Failed to get document details'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_search_history(request):
    """Get user's search history."""
    try:
        # Get clerk_user_id from middleware or default for testing
        clerk_user_id = getattr(request, 'clerk_user_id', None)
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        logger.info(f"get_search_history called with user_id: {clerk_user_id}, has_auth_header: {bool(auth_header)}")
        
        # If no authenticated user, return empty array for now
        if not clerk_user_id:
            logger.info("No authenticated user, returning empty history")
            return Response([])
        
        logger.info(f"get_search_history called for user: {clerk_user_id}")
        
        # Get user's search history
        history = SearchHistory.objects.filter(clerk_user_id=clerk_user_id).order_by('-created_at')[:50]  # type: ignore
        logger.info(f"Found {history.count()} search history items for user {clerk_user_id}")
        
        # If no history found, let's check if there are any entries for similar user patterns
        if history.count() == 0:
            # Check for any entries that might match this user
            all_entries = SearchHistory.objects.all().order_by('-created_at')[:10]  # type: ignore
            logger.info(f"User {clerk_user_id} has no history. Recent entries from all users: {[{'user': h.clerk_user_id, 'query': h.search_query} for h in all_entries]}")
        
        serializer = SearchHistorySerializer(history, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Error getting search history: {str(e)}")
        return Response(
            {'error': 'Failed to get search history'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def debug_search_history(request):
    """Debug endpoint to see all search history entries."""
    try:
        # Get all entries for debugging
        all_history = SearchHistory.objects.all().order_by('-created_at')[:20]  # type: ignore
        
        debug_info = {
            'total_entries': SearchHistory.objects.count(),  # type: ignore
            'user_id_from_request': getattr(request, 'clerk_user_id', None),
            'auth_header': request.META.get('HTTP_AUTHORIZATION', '')[:50] + '...' if request.META.get('HTTP_AUTHORIZATION') else None,
            'recent_entries': [
                {
                    'id': h.id,
                    'user_id': h.clerk_user_id,
                    'query': h.search_query,
                    'results_count': h.results_count,
                    'created_at': h.created_at.isoformat()
                } for h in all_history
            ]
        }
        
        return Response(debug_info)
        
    except Exception as e:
        logger.error(f"Error in debug endpoint: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_search_history_item(request, history_id):
    """Delete a specific search history item."""
    try:
        # Get clerk_user_id from middleware
        clerk_user_id = getattr(request, 'clerk_user_id', None)
        if not clerk_user_id:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get and delete the history item (ensure it belongs to the user)
        history_item = get_object_or_404(SearchHistory, id=history_id, clerk_user_id=clerk_user_id)  # type: ignore
        history_item.delete()
        
        return Response({'message': 'Search history item deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting search history item: {str(e)}")
        return Response(
            {'error': 'Failed to delete search history item'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'HEAD', 'OPTIONS'])
def serve_document_file(request, document_id):
    """Serve the PDF file for a document."""
    # Handle CORS preflight requests
    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Range'
        response['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'
        return response
    
    try:
        logger.info(f"Serving document file for ID: {document_id}")
        document = get_object_or_404(Document, id=document_id)
        logger.info(f"Found document: {document.title} with file_path: {document.file_path}")
        
        # Resolve the full file path
        # Handle both forward and backslashes for cross-platform compatibility
        if document.file_path.startswith('pdfs/') or document.file_path.startswith('pdfs\\'):
            # Relative path from project root - normalize path separators
            relative_path = document.file_path.replace('\\', os.sep).replace('/', os.sep)
            full_path = os.path.join(settings.BASE_DIR, relative_path)
        else:
            # Absolute path or relative to current directory
            full_path = document.file_path
        
        # Check if file exists
        if not os.path.exists(full_path):
            logger.error(f"PDF file not found at path: {full_path}")
            raise Http404("PDF file not found")
        
        # Serve the file
        response = FileResponse(
            open(full_path, 'rb'),
            content_type='application/pdf'
        )
        response['Content-Disposition'] = f'inline; filename="{document.filename}"'
        response['Accept-Ranges'] = 'bytes'  # Enable range requests for PDF.js
        response['Access-Control-Allow-Origin'] = '*'  # Allow CORS for PDF files
        response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Range'
        response['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range, Accept-Ranges'
        return response
        
    except Exception as e:
        logger.error(f"Error serving document file: {str(e)}")
        raise Http404("PDF file not found")


# Chat endpoints
@api_view(['POST'])
def create_chat_conversation(request):
    """Create a new conversation and return its ID."""
    try:
        clerk_user_id = getattr(request, 'clerk_user_id', 'anonymous')
        title = request.data.get('title')
        conv = Conversation.objects.create(clerk_user_id=clerk_user_id, title=title)  # type: ignore
        return Response({'conversation_id': str(conv.id)})
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        return Response({'error': 'Failed to create conversation'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_chat_conversations(request):
    """List recent conversations for the user."""
    try:
        clerk_user_id = getattr(request, 'clerk_user_id', None)
        if not clerk_user_id:
            return Response([])
        convs = Conversation.objects.filter(clerk_user_id=clerk_user_id).order_by('-updated_at')[:50]  # type: ignore
        serializer = ConversationSerializer(convs, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error listing conversations: {str(e)}")
        return Response({'error': 'Failed to list conversations'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_chat_messages(request, conversation_id):
    """Fetch messages for a conversation."""
    try:
        clerk_user_id = getattr(request, 'clerk_user_id', None)
        conv = get_object_or_404(Conversation, id=conversation_id)
        if clerk_user_id and str(conv.id) != conversation_id and conv.clerk_user_id != clerk_user_id:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        msgs = ChatMessage.objects.filter(conversation=conv).order_by('created_at')  # type: ignore
        serializer = ChatMessageSerializer(msgs, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        return Response({'error': 'Failed to fetch messages'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def post_chat_message(request, conversation_id):
    """Send a new user message, generate assistant reply with citations, store both, and return answer & sources."""
    try:
        clerk_user_id = getattr(request, 'clerk_user_id', 'anonymous')
        conv = get_object_or_404(Conversation, id=conversation_id)
        if conv.clerk_user_id != clerk_user_id and clerk_user_id is not None:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Store user message
        ChatMessage.objects.create(conversation=conv, role='user', content=content, citations=[], document_ids=[])  # type: ignore[attr-defined]
        
        # Retrieval using cosine similarity
        similar_chunks = chromadb_service.search_similar_chunks(query=content, n_results=10)
        
        if not similar_chunks:
            fallback_answer = "I couldn't find relevant information to answer your question from the indexed PDFs."
            # Store assistant message with empty citations
            ChatMessage.objects.create(  # type: ignore[attr-defined]
                conversation=conv,
                role='assistant',
                content=fallback_answer,
                citations=[],
                document_ids=[]
            )
            if not conv.title:
                conv.title = content[:80]
                conv.save()
            return Response({'answer': fallback_answer, 'sources': []})
        
        # Generate answer
        result = gemini_service.search_and_answer(content, similar_chunks)
        
        # Augment sources with page numbers
        augmented_sources = []
        for src in result.get('sources', []):
            try:
                doc_id = src['document_id']
                chunk_idx = src['chunk_index']
                document = Document.objects.get(id=doc_id)  # type: ignore
                
                # Resolve full file path
                if document.file_path.startswith('pdfs/') or document.file_path.startswith('pdfs\\'):
                    relative_path = document.file_path.replace('\\', os.sep).replace('/', os.sep)
                    full_path = os.path.join(settings.BASE_DIR, relative_path)
                else:
                    full_path = document.file_path
                
                matched_chunk = next((c for c in similar_chunks 
                                      if c['metadata']['document_id'] == doc_id and 
                                         c['metadata']['chunk_index'] == chunk_idx), None)
                chunk_text = matched_chunk['text'] if matched_chunk else src.get('text_preview', '')
                pages = pdf_service.find_text_pages(full_path, chunk_text)
                page = pages[0] if pages else None
                augmented_sources.append({**src, 'page': page})
            except Exception:
                augmented_sources.append(src)
        
        # Store assistant message
        ChatMessage.objects.create(  # type: ignore[attr-defined]
            conversation=conv,
            role='assistant',
            content=result.get('answer', ''),
            citations=augmented_sources,
            document_ids=[chunk['metadata']['document_id'] for chunk in similar_chunks]
        )
        
        # Update conversation title if empty
        if not conv.title:
            conv.title = content[:80]
            conv.save()
        
        return Response({'answer': result.get('answer', ''), 'sources': augmented_sources})
    except Exception as e:
        logger.error(f"Error posting chat message: {str(e)}")
        return Response({'error': 'Failed to process message'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_chat_conversation(request, conversation_id):
    """Delete a specific conversation and its messages for the authenticated user."""
    try:
        clerk_user_id = getattr(request, 'clerk_user_id', None)
        if not clerk_user_id:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        conv = get_object_or_404(Conversation, id=conversation_id, clerk_user_id=clerk_user_id)
        conv.delete()
        return Response({'message': 'Conversation deleted successfully'})
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        return Response({'error': 'Failed to delete conversation'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
