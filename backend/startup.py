#!/usr/bin/env python
"""
Startup script for the RAG backend.
This script initializes the database and ingests PDFs on startup.
"""
import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(project_dir))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rag_backend.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def main():
    """Main startup function."""
    print("🚀 Starting RAG Backend...")
    
    try:
        # Run migrations
        print("📊 Running database migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
        
        # Check if PDFs directory exists
        pdfs_path = Path(settings.PDFS_PATH)
        if not pdfs_path.exists():
            print(f"⚠️  PDFs directory not found: {pdfs_path}")
            print("   Please create the directory and add PDF files")
            return
        
        # Check if there are any PDFs
        pdf_files = list(pdfs_path.glob("*.pdf"))
        if not pdf_files:
            print(f"⚠️  No PDF files found in {pdfs_path}")
            print("   Please add PDF files to the directory")
            return
        
        print(f"📄 Found {len(pdf_files)} PDF files")
        
        # Check if documents already exist
        from documents.models import Document
        existing_docs = Document.objects.count()
        
        if existing_docs > 0:
            print(f"📚 Found {existing_docs} existing documents")
            response = input("Do you want to re-ingest all PDFs? (y/N): ")
            if response.lower() == 'y':
                print("🔄 Re-ingesting PDFs...")
                execute_from_command_line(['manage.py', 'ingest_pdfs', '--force'])
            else:
                print("⏭️  Skipping PDF ingestion")
        else:
            print("📥 Ingesting PDFs...")
            execute_from_command_line(['manage.py', 'ingest_pdfs'])
        
        print("✅ Startup complete!")
        print("🌐 Starting Django development server...")
        
        # Start Django server
        execute_from_command_line(['manage.py', 'runserver', '0.0.0.0:8000'])
        
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        print(f"❌ Startup failed: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
