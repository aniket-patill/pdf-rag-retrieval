"""
Serializers for the documents app.
"""
from rest_framework import serializers
from .models import Document, QueryHistory, SearchHistory, Conversation, ChatMessage


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model."""
    
    class Meta:
        model = Document
        fields = ['id', 'title', 'filename', 'summary', 'summary_generated_at', 'created_at']


class DocumentSummarySerializer(serializers.Serializer):
    """Serializer for document summary requests."""
    summary = serializers.CharField(read_only=True)
    generated_at = serializers.DateTimeField(read_only=True)


class QuerySerializer(serializers.Serializer):
    """Serializer for query requests."""
    query = serializers.CharField(max_length=1000)
    document_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        allow_empty=True
    )


class QueryResponseSerializer(serializers.Serializer):
    """Serializer for query responses."""
    response = serializers.CharField()
    sources = serializers.ListField(
        child=serializers.DictField(),
        read_only=True
    )


class SearchSerializer(serializers.Serializer):
    """Serializer for search requests."""
    query = serializers.CharField(max_length=500)
    limit = serializers.IntegerField(default=10, min_value=1, max_value=50)


class SearchResultSerializer(serializers.Serializer):
    """Serializer for search results."""
    document = DocumentSerializer()
    score = serializers.FloatField()
    chunk_text = serializers.CharField()
    chunk_index = serializers.IntegerField()


class QueryHistorySerializer(serializers.ModelSerializer):
    """Serializer for QueryHistory model."""
    
    class Meta:
        model = QueryHistory
        fields = ['id', 'query', 'response', 'document_ids', 'created_at']
        read_only_fields = ['id', 'created_at']


class SearchHistorySerializer(serializers.ModelSerializer):
    """Serializer for SearchHistory model."""
    
    class Meta:
        model = SearchHistory
        fields = ['id', 'search_query', 'results_count', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for Conversation model."""

    class Meta:
        model = Conversation
        fields = ['id', 'clerk_user_id', 'title', 'created_at', 'updated_at']
        read_only_fields = ['id', 'clerk_user_id', 'created_at', 'updated_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for ChatMessage model."""

    class Meta:
        model = ChatMessage
        fields = ['id', 'conversation', 'role', 'content', 'citations', 'document_ids', 'created_at']
        read_only_fields = ['id', 'created_at']
