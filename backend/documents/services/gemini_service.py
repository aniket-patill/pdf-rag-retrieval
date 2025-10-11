"""
Service for Google Gemini AI operations.
"""
import os
import google.generativeai as genai
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class GeminiService:
    """Service for Google Gemini AI operations."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required")
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
    
    def generate_summary(self, text: str, title: str = "", max_length: int = 500) -> str:
        """
        Generate a summary of the provided text.
        
        Args:
            text: The text to summarize
            max_length: Maximum length of the summary
            
        Returns:
            Generated summary
        """
        try:
            title_context = f"Document: {title}\n\n" if title else ""
            prompt = f"""
            Please provide a concise summary of the following text. 
            The summary should be no more than {max_length} characters and capture the main points.
            
            {title_context}Text:
            {text[:4000]}  # Limit input to avoid token limits
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
        """
        Answer a question based on provided context chunks.
        
        Args:
            question: The user's question
            context_chunks: List of relevant text chunks for context
            
        Returns:
            AI-generated answer
        """
        try:
            # Prepare context from chunks
            context_text = "\n\n".join([
                f"Document {chunk['metadata']['document_id']} (Chunk {chunk['metadata']['chunk_index']}):\n{chunk['text']}"
                for chunk in context_chunks
            ])
            
            prompt = f"""
            Based on the following context from documents, please answer the user's question.
            If the answer cannot be found in the provided context, please say so clearly.
            Provide a helpful and accurate response based only on the given information.
            
            Context:
            {context_text[:6000]}  # Limit context to avoid token limits
            
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
        """
        Search for relevant information and provide an answer.
        
        Args:
            query: The search query
            context_chunks: List of relevant text chunks
            
        Returns:
            Dictionary with answer and sources
        """
        try:
            # Prepare context
            context_text = "\n\n".join([
                f"Source {i+1} (Document {chunk['metadata']['document_id']}):\n{chunk['text']}"
                for i, chunk in enumerate(context_chunks)
            ])
            
            prompt = f"""
            Based on the following search results, please provide a comprehensive answer to the user's query.
            Include relevant information from the sources and cite which sources you're using.
            
            Search Results:
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
                    'text_preview': chunk['text'][:200] + "..." if len(chunk['text']) > 200 else chunk['text']
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
