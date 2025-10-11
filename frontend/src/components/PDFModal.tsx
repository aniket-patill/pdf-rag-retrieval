import { X, Sparkles, MessageSquare, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PDFViewer } from "./PDFViewer";
import { apiService } from "@/lib/api";

interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentId: string;
  onSummarize?: () => void;
  onAskAI?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export function PDFModal({
  isOpen,
  onClose,
  documentTitle,
  documentId,
  onSummarize,
  onAskAI,
  onToggleFavorite,
  isFavorite = false,
}: PDFModalProps) {
  const [favorite, setFavorite] = useState(isFavorite);

  const handleFavoriteToggle = () => {
    setFavorite(!favorite);
    onToggleFavorite?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-4 md:inset-8 bg-card rounded-lg shadow-2xl animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold line-clamp-1">{documentTitle}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onSummarize}>
              <Sparkles className="h-4 w-4 mr-2" />
              Summarize
            </Button>
            <Button variant="outline" size="sm" onClick={onAskAI}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask AI
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavoriteToggle}
            >
              <Heart
                className={`h-5 w-5 ${
                  favorite ? "fill-accent text-accent" : ""
                }`}
              />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 m-4 rounded-lg overflow-hidden">
          <PDFViewer 
            fileUrl={apiService.getDocumentFileUrl(documentId)} 
            title={documentTitle} 
          />
        </div>
      </div>
    </div>
  );
}
