import os
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from documents.models import Document, DocumentChunk
from documents.services.pdf_service import PDFService
from documents.services.embedding_service import EmbeddingService
from documents.services.chromadb_service import ChromaDBService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Ingest PDFs from the pdfs directory and generate embeddings'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-ingestion of all PDFs, even if they already exist',
        )
        parser.add_argument(
            '--pdfs-path',
            type=str,
            help='Path to PDFs directory (overrides settings)',
        )
    
    def handle(self, *args, **options):
        force = options['force']
        pdfs_path = options.get('pdfs_path') or settings.PDFS_PATH
        
        self.stdout.write(
            self.style.SUCCESS(f'Starting PDF ingestion from: {pdfs_path}')
        )
        
        try:
            # Initialize services
            pdf_service = PDFService(pdfs_path)
            embedding_service = EmbeddingService()
            chromadb_service = ChromaDBService(settings.CHROMADB_PATH)
            
            # Find PDF files
            pdf_files = pdf_service.find_pdf_files()
            
            if not pdf_files:
                self.stdout.write(
                    self.style.WARNING('No PDF files found in the specified directory')
                )
                return
            
            self.stdout.write(f'Found {len(pdf_files)} PDF files')
            
            # Process each PDF
            processed_count = 0
            skipped_count = 0
            error_count = 0
            
            for pdf_file in pdf_files:
                try:
                    # Generate document ID from file hash
                    document_id = pdf_service.get_file_hash(pdf_file)
                    
                    # Check if document already exists
                    if not force and Document.objects.filter(id=document_id).exists():
                        self.stdout.write(f'Skipping {pdf_file.name} (already exists)')
                        skipped_count += 1
                        continue
                    
                    self.stdout.write(f'Processing {pdf_file.name}...')
                    
                    # Extract text and metadata
                    text, doc_info = pdf_service.process_pdf(pdf_file)
                    
                    if not text.strip():
                        self.stdout.write(
                            self.style.WARNING(f'No text extracted from {pdf_file.name}')
                        )
                        continue
                    
                    # Create or update document
                    document, created = Document.objects.get_or_create(
                        id=document_id,
                        defaults={
                            'title': doc_info['title'],
                            'filename': doc_info['filename'],
                            'file_path': doc_info['file_path'],
                        }
                    )
                    
                    if not created and force:
                        # Update existing document
                        document.title = doc_info['title']
                        document.filename = doc_info['filename']
                        document.file_path = doc_info['file_path']
                        document.save()
                        
                        # Delete existing chunks
                        DocumentChunk.objects.filter(document=document).delete()
                        chromadb_service.delete_document_chunks(document_id)
                    
                    # Split text into chunks
                    chunks = embedding_service.split_text_into_chunks(text)
                    
                    if not chunks:
                        self.stdout.write(
                            self.style.WARNING(f'No chunks created for {pdf_file.name}')
                        )
                        continue
                    
                    # Save chunks to database
                    chunk_objects = []
                    for chunk in chunks:
                        chunk_obj = DocumentChunk.objects.create(
                            document=document,
                            chunk_index=chunk['chunk_index'],
                            text=chunk['text'],
                            embedding_id=embedding_service.create_chunk_embedding_id(
                                document_id, chunk['chunk_index']
                            )
                        )
                        chunk_objects.append(chunk_obj)
                    
                    # Add chunks to ChromaDB
                    chromadb_service.add_document_chunks(document_id, chunks)
                    
                    processed_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'Successfully processed {pdf_file.name} ({len(chunks)} chunks)')
                    )
                    
                except Exception as e:
                    error_count += 1
                    logger.error(f'Error processing {pdf_file.name}: {str(e)}')
                    self.stdout.write(
                        self.style.ERROR(f'Error processing {pdf_file.name}: {str(e)}')
                    )
            
            # Summary
            self.stdout.write('\n' + '='*50)
            self.stdout.write(
                self.style.SUCCESS(f'PDF Ingestion Complete!')
            )
            self.stdout.write(f'Processed: {processed_count}')
            self.stdout.write(f'Skipped: {skipped_count}')
            self.stdout.write(f'Errors: {error_count}')
            
            # Show ChromaDB stats
            stats = chromadb_service.get_collection_stats()
            self.stdout.write(f'Total chunks in ChromaDB: {stats["total_chunks"]}')
            
        except Exception as e:
            logger.error(f'Fatal error during PDF ingestion: {str(e)}')
            self.stdout.write(
                self.style.ERROR(f'Fatal error: {str(e)}')
            )
            raise
