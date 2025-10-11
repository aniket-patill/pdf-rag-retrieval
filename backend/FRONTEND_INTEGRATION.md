# Frontend Integration Guide

This guide explains how to integrate the Django backend with your React + Clerk frontend.

## API Endpoints

### Base URL
```
http://localhost:8000/api/
```

### Authentication
Include Clerk JWT token in the Authorization header:
```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## API Endpoints

### 1. Documents

#### List Documents
```javascript
GET /api/docs/
```
**Response:**
```json
{
  "count": 30,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "abc123",
      "title": "Document Title",
      "filename": "document.pdf",
      "summary": "Document summary...",
      "summary_generated_at": "2024-01-01T12:00:00Z",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### Get Document Details
```javascript
GET /api/docs/{document_id}/
```

#### Get Document Summary
```javascript
GET /api/docs/{document_id}/summary/
```
**Response:**
```json
{
  "summary": "Generated summary...",
  "generated_at": "2024-01-01T12:00:00Z"
}
```

### 2. Search

#### Search Documents
```javascript
POST /api/search/
```
**Request:**
```json
{
  "query": "search terms",
  "limit": 10
}
```
**Response:**
```json
{
  "query": "search terms",
  "results": [
    {
      "document": {
        "id": "abc123",
        "title": "Document Title",
        "filename": "document.pdf",
        "summary": "Summary...",
        "summary_generated_at": "2024-01-01T12:00:00Z",
        "created_at": "2024-01-01T12:00:00Z"
      },
      "score": 0.95,
      "chunk_text": "Relevant text snippet...",
      "chunk_index": 0
    }
  ],
  "total": 5
}
```

### 3. Query (Requires Authentication)

#### Ask Questions
```javascript
POST /api/docs/query/
```
**Request:**
```json
{
  "query": "What is the main topic?",
  "document_ids": ["abc123", "def456"]  // Optional: limit to specific documents
}
```
**Response:**
```json
{
  "answer": "The main topic is...",
  "sources": [
    {
      "document_id": "abc123",
      "chunk_index": 0,
      "score": 0.95,
      "text_preview": "Relevant text snippet..."
    }
  ],
  "query": "What is the main topic?"
}
```

### 4. Favorites (Requires Authentication)

#### List Favorites
```javascript
GET /api/favorites/
```
**Response:**
```json
[
  {
    "id": 1,
    "document": {
      "id": "abc123",
      "title": "Document Title",
      "filename": "document.pdf",
      "summary": "Summary...",
      "summary_generated_at": "2024-01-01T12:00:00Z",
      "created_at": "2024-01-01T12:00:00Z"
    },
    "created_at": "2024-01-01T12:00:00Z"
  }
]
```

#### Add to Favorites
```javascript
POST /api/favorites/
```
**Request:**
```json
{
  "document_id": "abc123"
}
```

#### Remove from Favorites
```javascript
DELETE /api/favorites/{document_id}/
```

## Frontend Integration Examples

### 1. Update AIAssistant Component

```typescript
// components/AIAssistant.tsx
import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  initialSummary?: string;
  documentId?: string;
}

export function AIAssistant({ isOpen, onClose, initialSummary, documentId }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialSummary ? [{ role: "assistant", content: initialSummary }] : []
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const token = await getToken();
      const response = await fetch('http://localhost:8000/api/docs/query/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          document_ids: documentId ? [documentId] : undefined
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Sorry, I couldn't process your question. Please try again." 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ... rest of component
}
```

### 2. Update DocumentCard Component

```typescript
// components/DocumentCard.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

export interface Document {
  id: string;
  title: string;
  summary: string;
  isFavorite?: boolean;
}

interface DocumentCardProps {
  document: Document;
  onOpen?: (doc: Document) => void;
  onSummarize?: (doc: Document) => void;
  onToggleFavorite?: (doc: Document) => void;
}

export function DocumentCard({ document, onOpen, onSummarize, onToggleFavorite }: DocumentCardProps) {
  const [isFavorite, setIsFavorite] = useState(document.isFavorite || false);
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();

  const handleFavoriteToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const token = await getToken();
      
      if (isFavorite) {
        // Remove from favorites
        await fetch(`http://localhost:8000/api/favorites/${document.id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
      } else {
        // Add to favorites
        await fetch('http://localhost:8000/api/favorites/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ document_id: document.id })
        });
      }
      
      setIsFavorite(!isFavorite);
      onToggleFavorite?.(document);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ... rest of component
}
```

### 3. Create API Service

```typescript
// lib/api.ts
const API_BASE_URL = 'http://localhost:8000/api';

export class ApiService {
  private getHeaders(token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async getDocuments() {
    const response = await fetch(`${API_BASE_URL}/docs/`);
    return response.json();
  }

  async getDocumentSummary(documentId: string) {
    const response = await fetch(`${API_BASE_URL}/docs/${documentId}/summary/`);
    return response.json();
  }

  async searchDocuments(query: string, limit = 10) {
    const response = await fetch(`${API_BASE_URL}/search/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, limit })
    });
    return response.json();
  }

  async queryDocuments(query: string, documentIds?: string[], token?: string) {
    const response = await fetch(`${API_BASE_URL}/docs/query/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ query, document_ids: documentIds })
    });
    return response.json();
  }

  async getFavorites(token: string) {
    const response = await fetch(`${API_BASE_URL}/favorites/`, {
      headers: this.getHeaders(token)
    });
    return response.json();
  }

  async addFavorite(documentId: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/favorites/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ document_id: documentId })
    });
    return response.json();
  }

  async removeFavorite(documentId: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/favorites/${documentId}/`, {
      method: 'DELETE',
      headers: this.getHeaders(token)
    });
    return response.json();
  }
}

export const apiService = new ApiService();
```

### 4. Update Home Page

```typescript
// pages/Home.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { DocumentCard, Document } from "@/components/DocumentCard";
import { AIAssistant } from "@/components/AIAssistant";
import { apiService } from "@/lib/api";

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await apiService.getDocuments();
      setDocuments(data.results);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = async (doc: Document) => {
    setSelectedDoc(doc);
    setShowAssistant(true);
  };

  const handleSummarize = async (doc: Document) => {
    try {
      const summary = await apiService.getDocumentSummary(doc.id);
      // Show summary in a modal or update the document
      console.log('Summary:', summary);
    } catch (error) {
      console.error('Error getting summary:', error);
    }
  };

  // ... rest of component
}
```

## Error Handling

The backend returns consistent error responses:

```json
{
  "error": "Error message",
  "detail": "Detailed error information"
}
```

Handle errors in your frontend:

```typescript
try {
  const response = await fetch('/api/endpoint');
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Handle error in UI
}
```

## CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:3000` (React dev server)
- `http://localhost:5173` (Vite dev server)

If you're using a different port, update the `CORS_ALLOWED_ORIGINS` setting in `rag_backend/settings.py`.

## Development Tips

1. **Start the backend first**: Run `python run.py` in the backend directory
2. **Check API responses**: Use browser dev tools or Postman to test endpoints
3. **Monitor logs**: Check `logs/django.log` for backend errors
4. **Test authentication**: Ensure Clerk tokens are being sent correctly
5. **Handle loading states**: Show loading indicators for async operations
