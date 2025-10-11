const API_BASE_URL = 'http://localhost:8000/api';

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

export class ApiService {
  private getHeaders(token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('API headers with auth:', { ...headers, Authorization: 'Bearer [REDACTED]' });
    } else {
      console.log('API headers without auth:', headers);
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
    console.log('searchDocuments called with token:', !!token);
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
    console.log('getFavorites called with token:', !!token);
    const response = await fetch(`${API_BASE_URL}/favorites/`, {
      headers: this.getHeaders(token)
    });
    console.log('getFavorites response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('getFavorites error:', response.status, errorText);
      throw new Error(`Failed to fetch favorites: ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    console.log('getFavorites data:', data);
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
      console.error('addFavorite error:', response.status, errorText);
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
      console.error('removeFavorite error:', response.status, errorText);
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
    console.log('getSearchHistory called with token:', !!token, token ? `Token length: ${token.length}` : 'No token');
    const response = await fetch(`${API_BASE_URL}/history/`, {
      headers: this.getHeaders(token)
    });
    console.log('getSearchHistory response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('getSearchHistory error:', response.status, errorText);
      throw new Error(`Failed to fetch search history: ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    console.log('getSearchHistory data:', data);
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
      console.error('deleteSearchHistoryItem error:', response.status, errorText);
      throw new Error(`Failed to delete search history item: ${response.statusText} - ${errorText}`);
    }
  }
}

export const apiService = new ApiService();
