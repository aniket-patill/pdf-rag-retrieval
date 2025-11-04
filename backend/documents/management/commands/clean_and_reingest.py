import os
import shutil
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone
from documents.models import Document, DocumentChunk, SearchHistory, QueryHistory
from documents.services.pdf_service import PDFService
from documents.services.embedding_service import EmbeddingService
from documents.services.chromadb_service import ChromaDBService
from documents.services.gemini_service import GeminiService
from favorites.models import Favorite


class Command(BaseCommand):
    help = 'Clean the database and reingest all PDFs to remove duplicates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm that you want to delete all data and reingest',
        )
        parser.add_argument(
            '--keep-history',
            action='store_true',
            help='Keep search history and favorites (only clean documents)',
        )
        parser.add_argument(
            '--generate-summaries',
            action='store_true',
            help='Generate large summaries for all documents after ingestion',
        )
        parser.add_argument(
            '--summary-length',
            type=int,
            default=1500,
            help='Maximum length for summaries (default: 1500 characters)',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            print('⚠️ WARNING: This command will DELETE ALL documents, chunks, and ChromaDB data!')
            print('Run with --confirm to proceed.')
            print('Use --keep-history to preserve search history and favorites.')
            return

        print('🚀 Starting database cleanup and re-ingestion...')

        # Step 1: Clean the database
        self.clean_database(keep_history=options['keep_history'])

        # Step 2: Clean ChromaDB
        self.clean_chromadb()

        # Step 3: Reingest all PDFs
        self.reingest_pdfs(generate_summaries=options['generate_summaries'], 
                          summary_length=options['summary_length'])

        print('✅ Database cleanup and re-ingestion completed successfully!')

    def clean_database(self, keep_history=False):
        print('🧹 Cleaning database...')

        # Delete in the correct order to avoid foreign key constraints
        deleted_chunks = DocumentChunk.objects.count()  # type: ignore
        DocumentChunk.objects.all().delete()  # type: ignore
        print(f'  Deleted {deleted_chunks} document chunks')

        deleted_favorites = Favorite.objects.count()  # type: ignore
        Favorite.objects.all().delete()  # type: ignore
        print(f'  Deleted {deleted_favorites} favorites')

        deleted_documents = Document.objects.count()  # type: ignore
        Document.objects.all().delete()  # type: ignore
        print(f'  Deleted {deleted_documents} documents')

        if not keep_history:
            deleted_search_history = SearchHistory.objects.count()  # type: ignore
            SearchHistory.objects.all().delete()  # type: ignore
            print(f'  Deleted {deleted_search_history} search history items')

            deleted_query_history = QueryHistory.objects.count()  # type: ignore
            QueryHistory.objects.all().delete()  # type: ignore
            print(f'  Deleted {deleted_query_history} query history items')
        else:
            print('  Kept search and query history as requested')

    def clean_chromadb(self):
        print('🗃️ Cleaning ChromaDB...')
        
        try:
            # Initialize ChromaDB service
            chromadb_service = ChromaDBService(settings.CHROMADB_PATH)
            
            # Delete the existing collection
            try:
                chromadb_service.client.delete_collection("documents")  # type: ignore
                print('  Deleted ChromaDB collection')
            except:
                print('  ChromaDB collection already empty or doesn\'t exist')
            
            # Recreate the collection
            chromadb_service._initialize_client()  # type: ignore
            print('  Recreated ChromaDB collection')
            
        except Exception as e:
            print(f'⚠️ ChromaDB cleanup warning: {str(e)}')

    def reingest_pdfs(self, generate_summaries=False, summary_length=1500):
        print('📄 Re-ingesting PDFs...')

        # Initialize services
        pdf_service = PDFService(settings.PDFS_PATH)
        embedding_service = EmbeddingService()
        chromadb_service = ChromaDBService(settings.CHROMADB_PATH)

        # Get all PDF files
        pdfs_path = settings.PDFS_PATH
        if not os.path.exists(pdfs_path):
            raise CommandError(f'PDFs directory does not exist: {pdfs_path}')

        pdf_files = [f for f in os.listdir(pdfs_path) if f.lower().endswith('.pdf')]
        
        if not pdf_files:
            print('⚠️ No PDF files found in the pdfs directory')
            return

        print(f'  Found {len(pdf_files)} PDF files to process')

        processed_count = 0
        failed_count = 0

        for pdf_file in pdf_files:
            try:
                print(f'  Processing: {pdf_file}')
                
                # Create document record using the same approach as ingest_pdfs
                file_path = os.path.join(pdfs_path, pdf_file)
                
                # Generate document ID from file hash (same as ingest_pdfs)
                document_id = pdf_service.get_file_hash(Path(file_path))
                
                # Get document info
                doc_info = pdf_service.get_document_info(Path(file_path))
                
                # Create document
                document = Document.objects.create(  # type: ignore
                    id=document_id,
                    title=doc_info['title'],
                    filename=doc_info['filename'],
                    file_path=os.path.relpath(file_path, settings.BASE_DIR)
                )

                # Extract text from PDF
                text_content = pdf_service.extract_text_from_pdf(Path(file_path))
                
                # Create chunks using embedding service
                chunks = embedding_service.split_text_into_chunks(text_content)

                # Create chunk objects in database with embedding_id
                chunk_objects = []
                for chunk in chunks:
                    chunk_obj = DocumentChunk.objects.create(  # type: ignore
                        document=document,
                        text=chunk['text'],
                        chunk_index=chunk['chunk_index'],
                        embedding_id=embedding_service.create_chunk_embedding_id(
                            document_id, chunk['chunk_index']
                        )
                    )
                    chunk_objects.append(chunk_obj)

                # Add chunks to ChromaDB (embeddings generated automatically)
                success = chromadb_service.add_document_chunks(
                    document_id,
                    chunks
                )
                
                if not success:
                    print(f'    ⚠️ Failed to add chunks to ChromaDB for {pdf_file}')

                processed_count += 1
                print(f'    ✅ Processed {len(chunks)} chunks')

            except Exception as e:
                failed_count += 1
                print(f'    ❌ Failed to process {pdf_file}: {str(e)}')

        print(f'📊 Re-ingestion complete:')
        print(f'  ✅ Successfully processed: {processed_count} PDFs')
        if failed_count > 0:
            print(f'  ❌ Failed to process: {failed_count} PDFs')
        
        # Generate summaries if requested
        if generate_summaries and processed_count > 0:
            self.generate_summaries(summary_length)
    
    def generate_summaries(self, max_length=1500):
        print('🦾 Generating large summaries...')
        
        try:
            # Check if Gemini API key is configured
            if not settings.GEMINI_API_KEY:
                print('⚠️ GEMINI_API_KEY not configured, skipping summary generation')
                return
            
            # Initialize Gemini service
            gemini_service = GeminiService(settings.GEMINI_API_KEY)
            
            # Get all documents
            documents = Document.objects.all()  # type: ignore
            if not documents.exists():
                print('⚠️ No documents found for summary generation')
                return
            
            print(f'  Found {documents.count()} documents to generate summaries for')
            
            summary_count = 0
            error_count = 0
            
            for document in documents:
                try:
                    print(f'  Generating summary for: {document.filename}')
                    
                    # Get document text from chunks
                    chunks = document.chunks.all().order_by('chunk_index')  # type: ignore
                    if not chunks.exists():
                        print(f'    ⚠️ No chunks found for {document.filename}')
                        continue
                    
                    # Combine chunks into full text
                    full_text = ' '.join([chunk.text for chunk in chunks])
                    
                    # Generate large summary
                    summary = gemini_service.generate_summary(
                        full_text, 
                        document.title or document.filename,
                        max_length=max_length
                    )
                    
                    if summary:
                        # Update document with summary
                        document.summary = summary
                        document.summary_generated_at = timezone.now()
                        document.save()
                        
                        summary_count += 1
                        print(f'    ✅ Generated summary ({len(summary)} chars)')
                    else:
                        print(f'    ❌ Failed to generate summary')
                        error_count += 1
                        
                except Exception as e:
                    error_count += 1
                    print(f'    ❌ Error generating summary for {document.filename}: {str(e)}')
            
            print(f'📊 Summary generation complete:')
            print(f'  ✅ Successfully generated: {summary_count} summaries')
            if error_count > 0:
                print(f'  ❌ Failed to generate: {error_count} summaries')
                
        except Exception as e:
            print(f'❌ Fatal error during summary generation: {str(e)}')