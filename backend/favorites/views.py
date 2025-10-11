"""
Views for the favorites app.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from documents.models import Document
from .models import Favorite
from .serializers import FavoriteSerializer, FavoriteCreateSerializer


@api_view(['GET'])
def list_favorites(request):
    """List all favorites for the authenticated user."""
    import logging
    logger = logging.getLogger(__name__)
    
    # Get clerk_user_id from middleware or default for testing
    clerk_user_id = getattr(request, 'clerk_user_id', None)
    
    # If no authenticated user, return empty array
    if not clerk_user_id:
        logger.info("No authenticated user, returning empty favorites")
        return Response([])
    
    logger.info(f"list_favorites called for user: {clerk_user_id}")
    
    favorites = Favorite.objects.filter(clerk_user_id=clerk_user_id)  # type: ignore
    logger.info(f"Found {favorites.count()} favorites for user {clerk_user_id}")
    
    serializer = FavoriteSerializer(favorites, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def create_favorite(request):
    """Add a document to favorites."""
    import logging
    logger = logging.getLogger(__name__)
    
    # Get clerk_user_id from middleware
    clerk_user_id = getattr(request, 'clerk_user_id', None)
    logger.info(f"create_favorite called with user_id: {clerk_user_id}")
    
    if not clerk_user_id:
        logger.warning("No clerk_user_id found in request")
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    serializer = FavoriteCreateSerializer(data=request.data)
    if serializer.is_valid():
        document_id = serializer.validated_data['document_id']  # type: ignore
        document = get_object_or_404(Document, id=document_id)
        
        favorite, created = Favorite.objects.get_or_create(  # type: ignore
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


@api_view(['DELETE'])
def delete_favorite(request, document_id):
    """Remove a document from favorites."""
    # Get clerk_user_id from middleware
    clerk_user_id = getattr(request, 'clerk_user_id', None)
    if not clerk_user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        favorite = Favorite.objects.get(  # type: ignore
            clerk_user_id=clerk_user_id,
            document_id=document_id
        )
        favorite.delete()
        return Response({'message': 'Favorite removed'}, status=status.HTTP_200_OK)
    except Favorite.DoesNotExist:  # type: ignore
        return Response(
            {'error': 'Favorite not found'},
            status=status.HTTP_404_NOT_FOUND
        )
