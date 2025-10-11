"""
URL configuration for rag_backend project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('documents.urls')),
    path('api/', include('favorites.urls')),
]
