import os
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Tuple, Optional, Any
import logging
import re
import math

logger = logging.getLogger(__name__)
os.makedirs("chroma_db", exist_ok=True)


class ChromaDBService:
    
    def __init__(self, chromadb_path: str, collection_name: str = "documents"):
        self.chromadb_path = chromadb_path
        self.collection_name = collection_name
        self.client: Any = None
        self.collection: Any = None
        self._initialize_client()
    
    def _initialize_client(self):
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
                        'score': 1 - distance,
                        'rank': i + 1
                    })
            
            logger.info(f"Found {len(similar_chunks)} similar chunks for query")
            return similar_chunks
            
        except Exception as e:
            logger.error(f"Error searching similar chunks: {str(e)}")
            return []
    
    def delete_document_chunks(self, document_id: str) -> bool:
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
        try:
            count = self.collection.count()
            return {
                'total_chunks': count,
                'collection_name': self.collection_name
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            return {'total_chunks': 0, 'collection_name': self.collection_name}
    
    def hybrid_search(self, query: str, n_results: int = 10, top_k: int = 50, epsilon: float = 0.02, include_tfidf: bool = True, document_ids: Optional[List[str]] = None, unique_citations: bool = True) -> List[Dict]:
        try:
            where_clause = None
            if document_ids:
                where_clause = {"document_id": {"$in": document_ids}}

            results = self.collection.query(query_texts=[query], n_results=top_k, where=where_clause)
            if not results.get('documents') or not results['documents'][0]:
                logger.info("No candidates found for query")
                return []

            docs = results['documents'][0]
            metas = results['metadatas'][0]
            dists = results['distances'][0]

            semantic_scores = [1 - d for d in dists]
            semantic_scores = self._normalize_scores(semantic_scores)

            keyword_scores = [self._keyword_overlap_score(query, d) for d in docs]
            keyword_scores = self._normalize_scores(keyword_scores)

            tfidf_scores = [0.0] * len(docs)
            if include_tfidf:
                tfidf_scores = self._compute_tfidf_scores(query, docs)
                tfidf_scores = self._normalize_scores(tfidf_scores)

            candidates = []
            for i, (doc, meta) in enumerate(zip(docs, metas)):
                candidates.append({
                    'text': doc,
                    'metadata': meta,
                    'semantic_score': semantic_scores[i],
                    'keyword_score': keyword_scores[i],
                    'tfidf_score': tfidf_scores[i],
                    'score': semantic_scores[i]
                })

            candidates.sort(key=lambda x: x['semantic_score'], reverse=True)

            if candidates:
                group_start = 0
                for i in range(1, len(candidates)):
                    if candidates[group_start]['semantic_score'] - candidates[i]['semantic_score'] > epsilon:
                        slice_sorted = sorted(candidates[group_start:i], key=lambda x: x['keyword_score'], reverse=True)
                        candidates[group_start:i] = slice_sorted
                        group_start = i
                slice_sorted = sorted(candidates[group_start:], key=lambda x: x['keyword_score'], reverse=True)
                candidates[group_start:] = slice_sorted

            final = []
            seen_docs = set()
            for c in candidates:
                doc_id = c['metadata'].get('document_id')
                if unique_citations and doc_id in seen_docs:
                    continue
                final.append(c)
                if unique_citations and doc_id:
                    seen_docs.add(doc_id)
                if len(final) >= n_results:
                    break

            for idx, item in enumerate(final, start=1):
                item['rank'] = idx

            logger.info(f"Hybrid search produced {len(final)} results")
            return final
        except Exception as e:
            logger.error(f"Error in hybrid_search: {str(e)}")
            return []
    
    def _normalize_scores(self, scores: List[float]) -> List[float]:
        if not scores:
            return []
        mn = min(scores)
        mx = max(scores)
        if mx - mn <= 1e-12:
            return [0.0 for _ in scores]
        return [(s - mn) / (mx - mn) for s in scores]
    
    def _tokenize(self, text: str) -> List[str]:
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens
    
    def _keyword_overlap_score(self, query: str, doc: str) -> float:
        q_terms = set(self._tokenize(query))
        if not q_terms:
            return 0.0
        d_terms = set(self._tokenize(doc))
        overlap = len(q_terms & d_terms)
        return overlap / len(q_terms)
    
    def _compute_tfidf_scores(self, query: str, docs: List[str]) -> List[float]:
        q_terms = set(self._tokenize(query))
        if not q_terms or not docs:
            return [0.0] * len(docs)
        doc_tokens = [self._tokenize(d) for d in docs]
        N = len(doc_tokens)
        df = {}
        for terms in doc_tokens:
            seen = set(terms)
            for t in seen:
                df[t] = df.get(t, 0) + 1
        idf = {t: math.log((N + 1) / (df.get(t, 0) + 1)) + 1.0 for t in q_terms}
        scores = []
        for terms in doc_tokens:
            if not terms:
                scores.append(0.0)
                continue
            tf = {}
            for t in terms:
                tf[t] = tf.get(t, 0) + 1
            for t in tf:
                tf[t] = tf[t] / len(terms)
            s = 0.0
            for t in q_terms:
                if t in tf:
                    s += tf[t] * idf.get(t, 1.0)
            scores.append(s)
        return scores
