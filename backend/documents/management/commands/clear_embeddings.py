import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from documents.models import Document, DocumentChunk
from documents.services.chromadb_service import ChromaDBService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clear all documents and embeddings from the database and ChromaDB'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm that you want to clear all data',
        )
    
    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'This will delete ALL documents and embeddings. '
                    'Use --confirm to proceed.'
                )
            )
            return
        
        self.stdout.write('Clearing all documents and embeddings...')
        
        try:
            # Clear database
            chunk_count = DocumentChunk.objects.count()
            document_count = Document.objects.count()
            
            DocumentChunk.objects.all().delete()
            Document.objects.all().delete()
            
            # Clear ChromaDB
            chromadb_service = ChromaDBService(settings.CHROMADB_PATH)
            # Note: ChromaDB doesn't have a clear_all method, so we'll recreate the collection
            try:
                chromadb_service.client.delete_collection(chromadb_service.collection_name)
                chromadb_service.collection = chromadb_service.client.create_collection(
                    name=chromadb_service.collection_name,
                    metadata={"description": "Document chunks for RAG retrieval"}
                )
            except Exception as e:
                logger.warning(f"Error clearing ChromaDB collection: {str(e)}")
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Cleared {document_count} documents and {chunk_count} chunks'
                )
            )
            
        except Exception as e:
            logger.error(f'Error clearing data: {str(e)}')
            self.stdout.write(
                self.style.ERROR(f'Error clearing data: {str(e)}')
            )
            raise
