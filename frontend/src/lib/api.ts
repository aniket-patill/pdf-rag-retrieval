const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://pdf-rag-retrieval-production.up.railway.app/api';

export interface Document {
  id: string;
  title: string;
  filename: string;
  summary: string;
  summary_generated_at?: string;
  created_at: string;
}

export interface SearchResult {
  document: Document;
  score: number;
  chunk_text: string;
  chunk_index: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

export interface QueryResponse {
  answer: string;
  sources: Array<{
    document_id: string;
    chunk_index: number;
    score: number;
    text_preview: string;
    page?: number;
    semantic_score?: number;
    keyword_score?: number;
    tfidf_score?: number;
  }>;
  query: string;
}

export interface Favorite {
  id: number;
  document: Document;
  created_at: string;
}

export interface QueryHistoryItem {
  id: number;
  query: string;
  response: string;
  document_ids: string[];
  created_at: string;
  result_count?: number;
}

export interface SearchHistoryItem {
  id: number;
  search_query: string;
  results_count: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  clerk_user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  conversation: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Array<{
    document_id: string;
    chunk_index: number;
    score: number;
    text_preview: string;
    page?: number;
    semantic_score?: number;
    keyword_score?: number;
    tfidf_score?: number;
  }>;
  document_ids: string[];
  created_at: string;
}

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

  async getDocuments(): Promise<{ results: Document[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/docs/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }
    return response.json();
  }

  async getDocumentSummary(documentId: string): Promise<{ summary: string; generated_at: string }> {
    const response = await fetch(`${API_BASE_URL}/docs/${documentId}/summary/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch document summary: ${response.statusText}`);
    }
    return response.json();
  }

  async searchDocuments(query: string, limit = 10, token?: string): Promise<SearchResponse> {
    const response = await fetch(`${API_BASE_URL}/search/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ query, limit })
    });
    if (!response.ok) {
      throw new Error(`Failed to search documents: ${response.statusText}`);
    }
    return response.json();
  }

  async queryDocuments(query: string, documentIds?: string[], token?: string): Promise<QueryResponse> {
    const response = await fetch(`${API_BASE_URL}/docs/query/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ query, document_ids: documentIds })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to query documents: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }

  async getFavorites(token?: string): Promise<Favorite[]> {
    const response = await fetch(`${API_BASE_URL}/favorites/`, {
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch favorites: ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    return data;
  }

  async addFavorite(documentId: string, token?: string): Promise<Favorite> {
    const response = await fetch(`${API_BASE_URL}/favorites/add/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ document_id: documentId })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add favorite: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }

  async removeFavorite(documentId: string, token?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/favorites/${documentId}/`, {
      method: 'DELETE',
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to remove favorite: ${response.statusText} - ${errorText}`);
    }
  }

  getDocumentFileUrl(documentId: string): string {
    return `${API_BASE_URL}/docs/${documentId}/file/`;
  }

  async getQueryHistory(token: string): Promise<QueryHistoryItem[]> {
    const response = await fetch(`${API_BASE_URL}/history/`, {
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch query history: ${response.statusText}`);
    }
    return response.json();
  }

  async getSearchHistory(token?: string): Promise<SearchHistoryItem[]> {
    const response = await fetch(`${API_BASE_URL}/history/`, {
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch search history: ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    return data;
  }

  async deleteQueryHistoryItem(historyId: number, token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/history/${historyId}/`, {
      method: 'DELETE',
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      throw new Error(`Failed to delete history item: ${response.statusText}`);
    }
  }

  async deleteSearchHistoryItem(historyId: number, token?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/history/${historyId}/`, {
      method: 'DELETE',
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete search history item: ${response.statusText} - ${errorText}`);
    }
  }
  async createConversation(token?: string): Promise<{ conversation_id: string }> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({})
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create conversation: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }

  async listConversations(token?: string): Promise<Conversation[]> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/list/`, {
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list conversations: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }

  async getConversationMessages(conversationId: string, token?: string): Promise<ChatMessage[]> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages/`, {
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch messages: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }

  async sendChatMessage(conversationId: string, content: string, token?: string): Promise<{ answer: string; sources: QueryResponse['sources'] }> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/message/`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ content })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send chat message: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }

  async deleteConversation(conversationId: string, token?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/delete/`, {
      method: 'DELETE',
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete conversation: ${response.statusText} - ${errorText}`);
    }
  }

  async uploadPdf(file: File, token?: string): Promise<{ message: string; document: Document }> {
    const formData = new FormData();
    formData.append('file', file);

    // For file uploads, we need to let the browser set the Content-Type header
    // with the correct boundary, so we don't set it explicitly
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/docs/upload/`, {
      method: 'POST',
      headers: headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Failed to upload PDF: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getUserDocuments(token?: string): Promise<Document[]> {
    const response = await fetch(`${API_BASE_URL}/docs/user/`, {
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch user documents: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteDocument(documentId: string, token?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/docs/${documentId}/delete/`, {
      method: 'DELETE',
      headers: this.getHeaders(token)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete document: ${response.statusText} - ${errorText}`);
    }
  }
}

export const apiService = new ApiService();
