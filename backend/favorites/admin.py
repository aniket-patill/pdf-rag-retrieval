"""
Admin configuration for favorites app.
"""
from django.contrib import admin
from .models import Favorite


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['clerk_user_id', 'document', 'created_at']
    list_filter = ['created_at', 'clerk_user_id']
    search_fields = ['clerk_user_id', 'document__title']
    readonly_fields = ['created_at']
