"""
Views for the favorites app.
"""
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from documents.models import Document
from .models import Favorite
from .serializers import FavoriteSerializer, FavoriteCreateSerializer
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
def list_favorites(request):
    """List all favorites for the authenticated user."""
    try:
        # Get clerk_user_id from middleware or default for testing
        clerk_user_id = getattr(request, 'clerk_user_id', None)
        
        # If no authenticated user, return empty array
        if not clerk_user_id:
            logger.info("No authenticated user, returning empty favorites")
            return Response([])
        
        logger.info(f"list_favorites called for user: {clerk_user_id}")
        
        favorites = Favorite.objects.filter(clerk_user_id=clerk_user_id)
        logger.info(f"Found {favorites.count()} favorites for user {clerk_user_id}")
        
        serializer = FavoriteSerializer(favorites, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error listing favorites: {str(e)}")
        return Response({'error': 'Failed to fetch favorites'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def create_favorite(request):
    """Add a document to favorites."""
    try:
        # Get clerk_user_id from middleware
        clerk_user_id = getattr(request, 'clerk_user_id', None)
        logger.info(f"create_favorite called with user_id: {clerk_user_id}")
        
        if not clerk_user_id:
            logger.warning("No clerk_user_id found in request")
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = FavoriteCreateSerializer(data=request.data)
        if serializer.is_valid():
            document_id = serializer.validated_data['document_id']
            document = get_object_or_404(Document, id=document_id)
            
            favorite, created = Favorite.objects.get_or_create(
                clerk_user_id=clerk_user_id,
                document=document
            )
            
            if created:
                logger.info(f"Created new favorite for user {clerk_user_id}, document {document_id}")
                return Response(
                    FavoriteSerializer(favorite).data,
                    status=status.HTTP_201_CREATED
                )
            else:
                logger.info(f"Document {document_id} already in favorites for user {clerk_user_id}")
                return Response(
                    {'message': 'Document already in favorites'},
                    status=status.HTTP_200_OK
                )
        
        logger.warning(f"Invalid serializer data: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error creating favorite: {str(e)}")
        return Response({'error': 'Failed to add favorite'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_favorite(request, document_id):
    """Remove a document from favorites."""
    try:
        # Get clerk_user_id from middleware
        clerk_user_id = getattr(request, 'clerk_user_id', None)
        if not clerk_user_id:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            favorite = Favorite.objects.get(
                clerk_user_id=clerk_user_id,
                document_id=document_id
            )
            favorite.delete()
            return Response({'message': 'Favorite removed'}, status=status.HTTP_200_OK)
        except Favorite.DoesNotExist:
            return Response(
                {'error': 'Favorite not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    except Exception as e:
        logger.error(f"Error deleting favorite: {str(e)}")
        return Response({'error': 'Failed to remove favorite'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)