import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { DocumentCard, Document } from "@/components/DocumentCard";
import { apiService, Document as ApiDocument } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();

  // Load documents and favorites on component mount
  useEffect(() => {
    loadDocuments();
    loadFavorites();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDocuments();
      const formattedDocs = data.results.map((doc: ApiDocument) => ({
        id: doc.id,
        title: doc.title || doc.filename,
        summary: doc.summary || "No summary available",
        isFavorite: false, // Will be updated when we load favorites
      }));
      
      // Remove duplicates based on ID
      const uniqueDocs = formattedDocs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );
      
      setDocuments(uniqueDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const token = await getToken();
      const favorites = await apiService.getFavorites(token || undefined);
      const favoriteIds = new Set(favorites.map(fav => fav.document.id));
      
      // Update documents with favorite status
      setDocuments(prev => 
        prev.map(doc => ({
          ...doc,
          isFavorite: favoriteIds.has(doc.id)
        }))
      );
      
      // Update search results with favorite status
      setSearchResults(prev => 
        prev.map(doc => ({
          ...doc,
          isFavorite: favoriteIds.has(doc.id)
        }))
      );
    } catch (error) {
      console.error('Error loading favorites:', error);
      // Silently ignore favorites errors - user might not be authenticated
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      console.log('Performing search:', query);
      
      // Get token for search history tracking
      const token = await getToken();
      console.log('Search with token:', !!token);
      
      const response = await apiService.searchDocuments(query, 10, token || undefined);
      console.log('Search response:', response);
      const formattedResults = response.results.map((result) => ({
        id: result.document.id,
        title: result.document.title || result.document.filename,
        summary: result.document.summary || "No summary available",
        isFavorite: false,
      }));
      
      // Remove duplicates based on ID
      const uniqueResults = formattedResults.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );
      
      setSearchResults(uniqueResults);
      console.log('Search completed, results:', uniqueResults.length);
    } catch (error) {
      console.error('Error searching documents:', error);
      toast({
        title: "Search Error",
        description: "Failed to search documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };



  const handleToggleFavorite = async (doc: Document) => {
    try {
      const token = await getToken();
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to manage favorites.",
          variant: "destructive",
        });
        return;
      }

      if (doc.isFavorite) {
        await apiService.removeFavorite(doc.id, token);
      } else {
        await apiService.addFavorite(doc.id, token);
      }

      // Update local state
      const updatedFavoriteStatus = !doc.isFavorite;
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, isFavorite: updatedFavoriteStatus } : d
        )
      );
      setSearchResults((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, isFavorite: updatedFavoriteStatus } : d
        )
      );

      toast({
        title: updatedFavoriteStatus ? "Added to Favorites" : "Removed from Favorites",
        description: `"${doc.title}" has been ${updatedFavoriteStatus ? 'added to' : 'removed from'} your favorites.`,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Your AI-Powered Pdf Hub
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Search, analyze, and interact with your Pdfs using advanced AI technology
          </p>
          <SearchBar onSearch={handleSearch} />
        </div>


        {/* Documents Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">
            {isSearching ? "Searching..." : searchResults.length > 0 ? "Search Results" : "Recent Documents"}
          </h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading documents...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchResults.length > 0 ? searchResults : documents).map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
          
          {!loading && documents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No documents found. Please add some PDF files to the backend.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
