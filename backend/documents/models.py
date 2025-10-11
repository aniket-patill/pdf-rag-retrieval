"""
Models for the documents app.
"""
from django.db import models
from django.utils import timezone


class Document(models.Model):
    """Model representing a PDF document."""
    
    id = models.CharField(max_length=255, primary_key=True)
    title = models.CharField(max_length=500)
    filename = models.CharField(max_length=500)
    file_path = models.CharField(max_length=1000)
    summary = models.TextField(blank=True, null=True)
    summary_generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return self.title or self.filename  # type: ignore


class DocumentChunk(models.Model):
    """Model representing a text chunk from a document."""
    
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    chunk_index = models.IntegerField()
    text = models.TextField()
    embedding_id = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['document', 'chunk_index']
        unique_together = ['document', 'chunk_index']
    
    def __str__(self) -> str:
        return f"{self.document.title} - Chunk {self.chunk_index}"  # type: ignore


class QueryHistory(models.Model):
    """Model for storing user query history."""
    
    clerk_user_id = models.CharField(max_length=255)
    query = models.TextField()
    response = models.TextField()
    document_ids = models.JSONField(default=list)  # List of document IDs used for context
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"Query by {self.clerk_user_id}: {self.query[:50]}..."  # type: ignore


class SearchHistory(models.Model):
    """Model for storing user search history."""
    
    clerk_user_id = models.CharField(max_length=255)
    search_query = models.TextField()
    results_count = models.IntegerField(default=0)  # type: ignore
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"Search by {self.clerk_user_id}: {self.search_query[:50]}..."  # type: ignore
