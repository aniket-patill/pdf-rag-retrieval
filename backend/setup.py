#!/usr/bin/env python
"""
Setup script for the RAG backend.
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

def main():
    """Setup the backend."""
    print("Setting up RAG Backend...")
    
    try:
        # Create necessary directories
        directories = ['logs', 'chroma_db', 'pdfs']
        for directory in directories:
            Path(directory).mkdir(exist_ok=True)
            print(f"Created directory: {directory}")
        
        # Run migrations
        print("Running database migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
        
        # Create superuser (optional)
        print("Creating superuser...")
        try:
            execute_from_command_line(['manage.py', 'createsuperuser', '--noinput'])
        except:
            print("   Superuser already exists or creation failed")
        
        print("Setup complete!")
        print("\nNext steps:")
        print("1. Copy env.example to .env and configure your API keys")
        print("2. Add PDF files to the pdfs/ directory")
        print("3. Run: python manage.py ingest_pdfs")
        print("4. Run: python run.py")
        
    except Exception as e:
        print(f"Setup failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
