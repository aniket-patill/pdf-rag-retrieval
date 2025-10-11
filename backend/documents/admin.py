"""
Admin configuration for documents app.
"""
from django.contrib import admin
from .models import Document, DocumentChunk, QueryHistory, SearchHistory


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'filename', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'filename']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ['document', 'chunk_index', 'embedding_id']
    list_filter = ['document']
    search_fields = ['text', 'embedding_id']


@admin.register(QueryHistory)
class QueryHistoryAdmin(admin.ModelAdmin):
    list_display = ['clerk_user_id', 'query', 'created_at']
    list_filter = ['created_at', 'clerk_user_id']
    search_fields = ['query', 'response']
    readonly_fields = ['created_at']


@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
    list_display = ['clerk_user_id', 'search_query', 'results_count', 'created_at']
    list_filter = ['created_at', 'clerk_user_id']
    search_fields = ['search_query']
    readonly_fields = ['created_at']
