"""
URL configuration for documents app.
"""
from django.urls import path
from . import views

urlpatterns = [
    path('docs/', views.list_documents, name='list_documents'),
    path('docs/query/', views.query_documents, name='query_documents'),  # Move this before the document_id pattern
    path('docs/<str:document_id>/', views.get_document_details, name='get_document_details'),
    path('docs/<str:document_id>/summary/', views.get_document_summary, name='get_document_summary'),
    path('docs/<str:document_id>/file/', views.serve_document_file, name='serve_document_file'),
    path('search/', views.search_documents, name='search_documents'),
    path('history/', views.get_search_history, name='get_search_history'),
    path('history/debug/', views.debug_search_history, name='debug_search_history'),
    path('history/<int:history_id>/', views.delete_search_history_item, name='delete_search_history_item'),
]
