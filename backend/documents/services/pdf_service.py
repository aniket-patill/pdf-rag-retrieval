import os
import hashlib
from pathlib import Path
from typing import List, Dict, Tuple
import fitz
import logging
import re

logger = logging.getLogger(__name__)


class PDFService:
    
    def __init__(self, pdfs_path: str):
        self.pdfs_path = Path(pdfs_path)

        try:
            self.pdfs_path.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not ensure PDFs directory exists at {pdfs_path}: {e}")
    
    def extract_text_from_pdf(self, file_path: Path) -> str:
        try:
            doc = fitz.open(file_path)  # type: ignore[attr-defined]
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
        with open(file_path, 'rb') as f:
            file_content = f.read()
            return hashlib.md5(file_content).hexdigest()
    
    def get_document_info(self, file_path: Path) -> Dict[str, str]:
        try:
            doc = fitz.open(file_path)  # type: ignore[attr-defined]
            metadata = doc.metadata
            doc.close()
            
            title = metadata.get('title', file_path.stem)
            if not title or title.strip() == '':
                title = file_path.stem
            
            return {
                'title': title,
                'filename': file_path.name,
                'file_path': str(file_path),
                'file_size': str(file_path.stat().st_size)
            }
            
        except Exception as e:
            logger.error(f"Error getting document info from {file_path}: {str(e)}")
            return {
                'title': file_path.stem,
                'filename': file_path.name,
                'file_path': str(file_path),
                'file_size': str(file_path.stat().st_size)
            }
    
    def find_pdf_files(self) -> List[Path]:
        pdf_files = []
        for file_path in self.pdfs_path.rglob("*.pdf"):
            if file_path.is_file():
                pdf_files.append(file_path)
        
        logger.info(f"Found {len(pdf_files)} PDF files")
        return pdf_files
    
    def process_pdf(self, file_path: Path) -> Tuple[str, Dict[str, str]]:
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

    def _normalize_text(self, text: str) -> str:
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"[^\w\s.,!?;:()\-]", "", text)
        return text.strip().lower()

    def find_text_pages(self, file_path: str, snippet: str, max_pages: int = 1) -> List[int]:
        pages: List[int] = []
        try:
            doc = fitz.open(file_path)  # type: ignore[attr-defined]
            norm_snippet = self._normalize_text(snippet)
            snippet_tokens = set(re.findall(r"\w+", norm_snippet))


            for i in range(len(doc)):
                page = doc.load_page(i)
                page_text = page.get_text()
                norm_page_text = self._normalize_text(page_text)
                if norm_snippet and norm_snippet in norm_page_text:
                    pages.append(i + 1)
                    if len(pages) >= max_pages:
                        break


            if not pages and snippet_tokens:
                best_page_index = -1
                best_overlap = 0
                for i in range(len(doc)):
                    page = doc.load_page(i)
                    page_text = page.get_text()
                    norm_page_text = self._normalize_text(page_text)
                    page_tokens = set(re.findall(r"\w+", norm_page_text))
                    overlap = len(snippet_tokens & page_tokens)
                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_page_index = i
                if best_page_index >= 0 and best_overlap > 0:
                    pages.append(best_page_index + 1)

            doc.close()
        except Exception as e:
            logger.error(f"Error finding text pages in {file_path}: {str(e)}")
        return pages
