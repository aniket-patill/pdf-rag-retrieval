import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { History as HistoryIcon, Search, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { apiService, SearchHistoryItem } from "@/lib/api";

interface HistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
}

export default function History() {
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      console.log('History page - Token available:', !!token);
      
      if (!token) {
        console.log('No token available, showing empty history');
        setHistoryItems([]);
        return;
      }
      
      const history = await apiService.getSearchHistory(token);
      console.log('Loaded search history:', history);
      setHistoryItems(history);
    } catch (error) {
      console.error('Error loading search history:', error);
      toast({
        title: "Error",
        description: "Failed to load search history. Please try signing in again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteHistoryItem = async (id: number) => {
    try {
      const token = await getToken();
      await apiService.deleteSearchHistoryItem(id, token || undefined);
      setHistoryItems(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Item Deleted",
        description: "Search history item has been removed.",
      });
    } catch (error) {
      console.error('Error deleting history item:', error);
      toast({
        title: "Error",
        description: "Failed to delete history item. Please sign in to manage your history.",
        variant: "destructive",
      });
    }
  };

  const handleRerunQuery = (query: string) => {
    console.log("Rerunning query:", query);
    // TODO: Implement query rerun with backend API
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <HistoryIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Search History</h1>
        </div>

        {historyItems.length === 0 && !loading ? (
          <div className="text-center py-16">
            <HistoryIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No search history found</h2>
            <p className="text-muted-foreground mb-4">
              Your search history will appear here after you perform searches while signed in.
            </p>
            <p className="text-sm text-muted-foreground">
              Make sure you're signed in and try searching for documents to build your history.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading search history...</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {historyItems.map((item) => (
              <Card key={item.id} className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.search_query}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                        <span>•</span>
                        <span>{item.results_count} results</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteHistoryItem(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
