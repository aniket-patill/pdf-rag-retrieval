"""
Service for text chunking and embedding generation.
"""
import re
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for text chunking and embedding operations."""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def split_text_into_chunks(self, text: str) -> List[Dict[str, any]]:
        """
        Split text into overlapping chunks for embedding.
        
        Args:
            text: The text to split
            
        Returns:
            List of chunk dictionaries with text and metadata
        """
        if not text.strip():
            return []
        
        # Clean and normalize text
        text = self._clean_text(text)
        
        # Split by sentences first
        sentences = self._split_into_sentences(text)
        
        chunks = []
        current_chunk = ""
        chunk_index = 0
        
        for sentence in sentences:
            # If adding this sentence would exceed chunk size, finalize current chunk
            if len(current_chunk) + len(sentence) > self.chunk_size and current_chunk:
                chunks.append({
                    'text': current_chunk.strip(),
                    'chunk_index': chunk_index,
                    'start_char': 0,  # Will be calculated properly in production
                    'end_char': len(current_chunk)
                })
                chunk_index += 1
                
                # Start new chunk with overlap
                overlap_text = self._get_overlap_text(current_chunk)
                current_chunk = overlap_text + " " + sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence
        
        # Add the last chunk if it has content
        if current_chunk.strip():
            chunks.append({
                'text': current_chunk.strip(),
                'chunk_index': chunk_index,
                'start_char': 0,
                'end_char': len(current_chunk)
            })
        
        logger.info(f"Split text into {len(chunks)} chunks")
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s.,!?;:()\-]', '', text)
        return text.strip()
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Simple sentence splitting - can be improved with NLP libraries
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _get_overlap_text(self, text: str) -> str:
        """Get the last part of text for overlap."""
        if len(text) <= self.chunk_overlap:
            return text
        
        # Find the last sentence within the overlap range
        sentences = self._split_into_sentences(text)
        overlap_text = ""
        
        for sentence in reversed(sentences):
            if len(overlap_text + sentence) <= self.chunk_overlap:
                overlap_text = sentence + " " + overlap_text
            else:
                break
        
        return overlap_text.strip()
    
    def create_chunk_embedding_id(self, document_id: str, chunk_index: int) -> str:
        """Create a unique embedding ID for a chunk."""
        return f"{document_id}_chunk_{chunk_index}"
