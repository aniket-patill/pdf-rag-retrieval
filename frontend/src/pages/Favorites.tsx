import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Header } from "@/components/Header";
import { DocumentCard, Document } from "@/components/DocumentCard";
import { Heart } from "lucide-react";
import { apiService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Favorites() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const favorites = await apiService.getFavorites(token || undefined);
      const formattedDocs = favorites.map((fav) => ({
        id: fav.document.id,
        title: fav.document.title || fav.document.filename,
        summary: fav.document.summary || "No summary available",
        isFavorite: true,
      }));
      setDocuments(formattedDocs);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load favorites. Please sign in to view your favorites.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (doc: Document) => {
    try {
      const token = await getToken();
      await apiService.removeFavorite(doc.id, token || undefined);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      
      toast({
        title: "Removed from Favorites",
        description: `"${doc.title}" has been removed from your favorites.`,
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites. Please sign in to manage favorites.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-8 w-8 text-accent fill-accent" />
          <h1 className="text-3xl font-bold">Favorite Documents</h1>
        </div>

        {documents.length === 0 && !loading ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground">
              Start favoriting documents to see them here
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading favorites...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
