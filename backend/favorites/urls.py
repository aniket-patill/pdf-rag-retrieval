"""
URL configuration for favorites app.
"""
from django.urls import path
from . import views

urlpatterns = [
    path('favorites/', views.list_favorites, name='list_favorites'),
    path('favorites/add/', views.create_favorite, name='create_favorite'),
    path('favorites/<str:document_id>/', views.delete_favorite, name='delete_favorite'),
]
