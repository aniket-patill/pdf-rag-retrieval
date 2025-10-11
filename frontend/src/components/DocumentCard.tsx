import { FileText, Heart } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface Document {
  id: string;
  title: string;
  summary: string;
  isFavorite?: boolean;
}

interface DocumentCardProps {
  document: Document;
  onOpen?: (doc: Document) => void;
  onToggleFavorite?: (doc: Document) => void;
}

export function DocumentCard({ 
  document, 
  onOpen, 
  onToggleFavorite 
}: DocumentCardProps) {
  const [isFavorite, setIsFavorite] = useState(document.isFavorite || false);
  const navigate = useNavigate();

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
    onToggleFavorite?.(document);
  };

  return (
    <Card className="hover-lift group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <FileText className="h-8 w-8 text-primary mb-2" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavoriteToggle}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Heart
              className={`h-5 w-5 ${
                isFavorite ? "fill-accent text-accent" : "text-muted-foreground"
              }`}
            />
          </Button>
        </div>
        <CardTitle className="line-clamp-1">{document.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {document.summary}
        </p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button 
          variant="default" 
          className="flex-1"
          onClick={() => navigate(`/document/${document.id}`)}
        >
          Open
        </Button>
      </CardFooter>
    </Card>
  );
}
