"""
Models for the favorites app.
"""
from django.db import models
from documents.models import Document


class Favorite(models.Model):
    """Model representing a user's favorite document."""
    
    clerk_user_id = models.CharField(max_length=255)
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['clerk_user_id', 'document']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.clerk_user_id} - {self.document.title}"
