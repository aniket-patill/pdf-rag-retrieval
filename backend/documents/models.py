from django.db import models
from django.utils import timezone
import uuid


class Document(models.Model):
    
    id = models.CharField(max_length=255, primary_key=True)
    title = models.CharField(max_length=500)
    filename = models.CharField(max_length=500)
    file_path = models.CharField(max_length=1000)
    clerk_user_id = models.CharField(max_length=255, blank=True, null=True)  # Track which user uploaded the document
    summary = models.TextField(blank=True, null=True)
    summary_generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return self.title or self.filename  # type: ignore


class DocumentChunk(models.Model):
    
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
    
    clerk_user_id = models.CharField(max_length=255)
    query = models.TextField()
    response = models.TextField()
    document_ids = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"Query by {self.clerk_user_id}: {self.query[:50]}..."  # type: ignore


class SearchHistory(models.Model):
    
    clerk_user_id = models.CharField(max_length=255)
    search_query = models.TextField()
    results_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"Search by {self.clerk_user_id}: {self.search_query[:50]}..."  # type: ignore


class Conversation(models.Model):
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clerk_user_id = models.CharField(max_length=255)
    title = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self) -> str:
        return f"Conversation {self.id} ({self.clerk_user_id})"  # type: ignore


class ChatMessage(models.Model):
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20)
    content = models.TextField()
    citations = models.JSONField(default=list)
    document_ids = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self) -> str:
        return f"{self.role} message in {self.conversation_id}: {self.content[:50]}..."  # type: ignore
