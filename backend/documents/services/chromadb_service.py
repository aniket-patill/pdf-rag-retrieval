"""
Service for ChromaDB operations.
"""
import os
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class ChromaDBService:
    """Service for ChromaDB vector database operations."""
    
    def __init__(self, chromadb_path: str, collection_name: str = "documents"):
        self.chromadb_path = chromadb_path
        self.collection_name = collection_name
        self.client = None
        self.collection = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize ChromaDB client and collection."""
        try:
            # Create directory if it doesn't exist
            os.makedirs(self.chromadb_path, exist_ok=True)
            
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(
                path=self.chromadb_path,
                settings=Settings(anonymized_telemetry=False)
            )
            
            # Get or create collection
            try:
                self.collection = self.client.get_collection(name=self.collection_name)
                logger.info(f"Connected to existing collection: {self.collection_name}")
            except Exception:
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    metadata={"description": "Document chunks for RAG retrieval"}
                )
                logger.info(f"Created new collection: {self.collection_name}")
                
        except Exception as e:
            logger.error(f"Error initializing ChromaDB: {str(e)}")
            raise
    
    def add_document_chunks(self, document_id: str, chunks: List[Dict]) -> bool:
        """
        Add document chunks to ChromaDB.
        
        Args:
            document_id: ID of the document
            chunks: List of chunk dictionaries with text and metadata
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not chunks:
                logger.warning(f"No chunks to add for document {document_id}")
                return False
            
            # Prepare data for ChromaDB
            ids = []
            texts = []
            metadatas = []
            
            for chunk in chunks:
                embedding_id = f"{document_id}_chunk_{chunk['chunk_index']}"
                ids.append(embedding_id)
                texts.append(chunk['text'])
                metadatas.append({
                    'document_id': document_id,
                    'chunk_index': chunk['chunk_index'],
                    'start_char': chunk.get('start_char', 0),
                    'end_char': chunk.get('end_char', len(chunk['text']))
                })
            
            # Add to collection
            self.collection.add(
                ids=ids,
                documents=texts,
                metadatas=metadatas
            )
            
            logger.info(f"Added {len(chunks)} chunks for document {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding chunks for document {document_id}: {str(e)}")
            return False
    
    def search_similar_chunks(self, query: str, n_results: int = 10, 
                            document_ids: Optional[List[str]] = None) -> List[Dict]:
        """
        Search for similar chunks using vector similarity.
        
        Args:
            query: Search query
            n_results: Number of results to return
            document_ids: Optional list of document IDs to filter by
            
        Returns:
            List of similar chunks with metadata
        """
        try:
            # Prepare where clause for filtering
            where_clause = None
            if document_ids:
                where_clause = {"document_id": {"$in": document_ids}}
            
            # Perform similarity search
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_clause
            )
            
            # Format results
            similar_chunks = []
            if results['documents'] and results['documents'][0]:
                for i, (doc, metadata, distance) in enumerate(zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )):
                    similar_chunks.append({
                        'text': doc,
                        'metadata': metadata,
                        'score': 1 - distance,  # Convert distance to similarity score
                        'rank': i + 1
                    })
            
            logger.info(f"Found {len(similar_chunks)} similar chunks for query")
            return similar_chunks
            
        except Exception as e:
            logger.error(f"Error searching similar chunks: {str(e)}")
            return []
    
    def delete_document_chunks(self, document_id: str) -> bool:
        """
        Delete all chunks for a specific document.
        
        Args:
            document_id: ID of the document to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Find all chunks for this document
            results = self.collection.get(
                where={"document_id": document_id}
            )
            
            if results['ids']:
                self.collection.delete(ids=results['ids'])
                logger.info(f"Deleted {len(results['ids'])} chunks for document {document_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting chunks for document {document_id}: {str(e)}")
            return False
    
    def get_collection_stats(self) -> Dict:
        """Get statistics about the collection."""
        try:
            count = self.collection.count()
            return {
                'total_chunks': count,
                'collection_name': self.collection_name
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            return {'total_chunks': 0, 'collection_name': self.collection_name}
