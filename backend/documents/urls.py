"""
URL configuration for documents app.
"""
from django.urls import path
from . import views

urlpatterns = [
    path('docs/', views.list_documents, name='list_documents'),
    path('docs/query/', views.query_documents, name='query_documents'),  # Move this before the document_id pattern
    path('docs/upload/', views.upload_pdf, name='upload_pdf'),  # Upload endpoint
    path('docs/user/', views.list_user_documents, name='list_user_documents'),  # User documents endpoint
    path('docs/<str:document_id>/', views.get_document_details, name='get_document_details'),
    path('docs/<str:document_id>/summary/', views.get_document_summary, name='get_document_summary'),
    path('docs/<str:document_id>/file/', views.serve_document_file, name='serve_document_file'),
    path('docs/<str:document_id>/delete/', views.delete_document, name='delete_document'),  # Delete endpoint
    path('search/', views.search_documents, name='search_documents'),
    path('history/', views.get_search_history, name='get_search_history'),
    path('history/debug/', views.debug_search_history, name='debug_search_history'),
    path('history/<int:history_id>/', views.delete_search_history_item, name='delete_search_history_item'),

    # Chat endpoints
    path('chat/conversations/', views.create_chat_conversation, name='create_chat_conversation'),
    path('chat/conversations/list/', views.list_chat_conversations, name='list_chat_conversations'),
    path('chat/conversations/<str:conversation_id>/messages/', views.get_chat_messages, name='get_chat_messages'),
    path('chat/conversations/<str:conversation_id>/message/', views.post_chat_message, name='post_chat_message'),
    path('chat/conversations/<str:conversation_id>/delete/', views.delete_chat_conversation, name='delete_chat_conversation'),
]
