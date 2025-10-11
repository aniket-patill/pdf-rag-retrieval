"""
Service for PDF text extraction and processing.
"""
import os
import hashlib
from pathlib import Path
from typing import List, Dict, Tuple
import fitz  # PyMuPDF
import logging

logger = logging.getLogger(__name__)


class PDFService:
    """Service for extracting text from PDF files."""
    
    def __init__(self, pdfs_path: str):
        self.pdfs_path = Path(pdfs_path)
        if not self.pdfs_path.exists():
            raise FileNotFoundError(f"PDFs directory not found: {pdfs_path}")
    
    def extract_text_from_pdf(self, file_path: Path) -> str:
        """
        Extract text from a PDF file using PyMuPDF.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text content
        """
        try:
            doc = fitz.open(file_path)
            text = ""
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text += page.get_text()
            
            doc.close()
            return text.strip()
            
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {str(e)}")
            raise
    
    def get_file_hash(self, file_path: Path) -> str:
        """Generate a hash for the file to use as document ID."""
        with open(file_path, 'rb') as f:
            file_content = f.read()
            return hashlib.md5(file_content).hexdigest()
    
    def get_document_info(self, file_path: Path) -> Dict[str, str]:
        """
        Get document information including title and metadata.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Dictionary with document information
        """
        try:
            doc = fitz.open(file_path)
            metadata = doc.metadata
            doc.close()
            
            title = metadata.get('title', file_path.stem)
            if not title or title.strip() == '':
                title = file_path.stem
            
            return {
                'title': title,
                'filename': file_path.name,
                'file_path': str(file_path),
                'file_size': file_path.stat().st_size
            }
            
        except Exception as e:
            logger.error(f"Error getting document info from {file_path}: {str(e)}")
            return {
                'title': file_path.stem,
                'filename': file_path.name,
                'file_path': str(file_path),
                'file_size': file_path.stat().st_size
            }
    
    def find_pdf_files(self) -> List[Path]:
        """
        Find all PDF files in the PDFs directory.
        
        Returns:
            List of PDF file paths
        """
        pdf_files = []
        for file_path in self.pdfs_path.rglob("*.pdf"):
            if file_path.is_file():
                pdf_files.append(file_path)
        
        logger.info(f"Found {len(pdf_files)} PDF files")
        return pdf_files
    
    def process_pdf(self, file_path: Path) -> Tuple[str, Dict[str, str]]:
        """
        Process a PDF file and extract text and metadata.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Tuple of (extracted_text, document_info)
        """
        try:
            text = self.extract_text_from_pdf(file_path)
            info = self.get_document_info(file_path)
            
            if not text.strip():
                logger.warning(f"No text extracted from {file_path}")
                return "", info
            
            return text, info
            
        except Exception as e:
            logger.error(f"Error processing PDF {file_path}: {str(e)}")
            raise
