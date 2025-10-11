"""
Serializers for the favorites app.
"""
from rest_framework import serializers
from .models import Favorite
from documents.serializers import DocumentSerializer


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for Favorite model."""
    document = DocumentSerializer(read_only=True)
    
    class Meta:
        model = Favorite
        fields = ['id', 'document', 'created_at']


class FavoriteCreateSerializer(serializers.Serializer):
    """Serializer for creating favorites."""
    document_id = serializers.CharField(max_length=255)
