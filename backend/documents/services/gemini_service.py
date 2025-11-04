from google.generativeai.generative_models import GenerativeModel


import os
import google.generativeai as genai
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class GeminiService:
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required")
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        self.model: GenerativeModel = genai.GenerativeModel('gemini-2.5-flash')
    
    def generate_summary(self, text: str, title: str = "", max_length: int = 1000) -> str:
        try:
            title_context = f"Document: {title}\n\n" if title else ""
            prompt = f"""
            Please provide a concise summary of the following text. 
            The summary should be no more than {max_length} characters and capture the main points.
            Focus on the key topics, findings, and conclusions in the document.
            
            {title_context}Text:
            {text[:8000]}
            """
            
            response = self.model.generate_content(prompt)
            summary = response.text.strip()
            
            # Truncate if too long
            if len(summary) > max_length:
                summary = summary[:max_length] + "..."
            
            logger.info(f"Generated summary of {len(summary)} characters")
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return "Unable to generate summary at this time."
    
    def answer_question(self, question: str, context_chunks: List[Dict]) -> str:
        try:
            # Prepare context from chunks
            context_text = "\n\n".join([
                f"Document {chunk['metadata']['document_id']} (Chunk {chunk['metadata']['chunk_index']}):\n{chunk['text']}"
                for chunk in context_chunks
            ])
            
            prompt = f"""
            You are a helpful assistant that answers questions based on provided document context.
            Use ONLY the information from the context below to answer the question.
            If the answer cannot be found in the provided context, say "I cannot find relevant information in the provided documents."
            
            Context:
            {context_text[:6000]}
            
            Question: {question}
            
            Answer:
            """
            
            response = self.model.generate_content(prompt)
            answer = response.text.strip()
            
            logger.info(f"Generated answer for question: {question[:50]}...")
            return answer
            
        except Exception as e:
            logger.error(f"Error generating answer: {str(e)}")
            return "I'm sorry, I encountered an error while processing your question. Please try again."
    
    def search_and_answer(self, query: str, context_chunks: List[Dict]) -> Dict:
        try:
            # Prepare context
            context_text = "\n\n".join([
                f"Source {i+1} (Document ID: {chunk['metadata']['document_id']}, Chunk: {chunk['metadata']['chunk_index']}):\n{chunk['text']}"
                for i, chunk in enumerate(context_chunks)
            ])
            
            prompt = f"""
            Based on the following search results, please provide a comprehensive answer to the user's query.
            Include relevant information from the sources and cite which sources you're using.
            
            Sources:
            {context_text[:6000]}
            
            Query: {query}
            
            Please provide:
            1. A direct answer to the query
            2. Supporting information from the sources
            3. Source references
            
            Response:
            """
            
            response = self.model.generate_content(prompt)
            answer = response.text.strip()
            
            # Extract sources
            sources = []
            for i, chunk in enumerate(context_chunks):
                sources.append({
                    'document_id': chunk['metadata']['document_id'],
                    'chunk_index': chunk['metadata']['chunk_index'],
                    'score': chunk.get('score', 0),
                    'text_preview': chunk['text'][:200] + "..." if len(chunk['text']) > 200 else chunk['text'],
                    'semantic_score': chunk.get('semantic_score'),
                    'keyword_score': chunk.get('keyword_score'),
                    'tfidf_score': chunk.get('tfidf_score')
                })
            
            return {
                'answer': answer,
                'sources': sources,
                'query': query
            }
            
        except Exception as e:
            logger.error(f"Error in search and answer: {str(e)}")
            return {
                'answer': "I'm sorry, I encountered an error while processing your query. Please try again.",
                'sources': [],
                'query': query
            }