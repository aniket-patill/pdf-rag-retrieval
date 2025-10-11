import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Heart, Share2, Download, FileText, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PDFViewer } from "@/components/PDFViewer";
import { apiService, Document as ApiDocument } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { toast } = useToast();
  
  const [document, setDocument] = useState<ApiDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("viewer");
  
  // Chat state
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDocuments();
      const doc = data.results.find((d: ApiDocument) => d.id === documentId);
      
      if (doc) {
        setDocument(doc);
        // Check if document is in favorites (only if user is authenticated)
        await loadFavoriteStatus();
      } else {
        toast({
          title: "Document Not Found",
          description: "The requested document could not be found.",
          variant: "destructive",
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast({
        title: "Error",
        description: "Failed to load document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteStatus = async () => {
    try {
      const token = await getToken();
      if (token && documentId) {
        const favorites = await apiService.getFavorites(token);
        const isFav = favorites.some(fav => fav.document.id === documentId);
        setIsFavorite(isFav);
      }
    } catch (error) {
      // Silently ignore favorites errors - user might not be authenticated
      console.log('Favorites check skipped (user not authenticated)');
    }
  };

  const handleToggleFavorite = async () => {
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

      if (isFavorite) {
        await apiService.removeFavorite(documentId!, token);
        setIsFavorite(false);
        toast({
          title: "Removed from Favorites",
          description: "Document has been removed from your favorites.",
        });
      } else {
        await apiService.addFavorite(documentId!, token);
        setIsFavorite(true);
        toast({
          title: "Added to Favorites",
          description: "Document has been added to your favorites.",
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (document && documentId) {
      // Create a temporary link element to trigger download
      const link = window.document.createElement('a');
      link.href = apiService.getDocumentFileUrl(documentId);
      link.download = document.filename || `document-${documentId}.pdf`;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your PDF download has started.",
      });
    } else {
      toast({
        title: "Error",
        description: "Unable to download document at this time.",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document?.title || document?.filename,
        text: document?.summary,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Document link has been copied to clipboard.",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiService.queryDocuments(
        currentInput,
        documentId ? [documentId] : undefined
      );

      setMessages(prev => [...prev, { role: "assistant", content: response.answer }]);
    } catch (error) {
      console.error('Error querying documents:', error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't process your question. Please try again or check if the backend services are running properly."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Document Not Found</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Construct PDF URL - this would need to be implemented in the backend
  const pdfUrl = documentId ? apiService.getDocumentFileUrl(documentId) : '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold truncate max-w-md">
                  {document.title || document.filename}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {document.filename}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button 
                variant={isFavorite ? "default" : "outline"} 
                size="icon" 
                onClick={handleToggleFavorite}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="viewer" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDF Viewer
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="query" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="viewer" className="space-y-4">
            <Card className="h-[calc(100vh-200px)]">
              <CardContent className="p-0 h-full">
                <PDFViewer fileUrl={pdfUrl} title={document.title || document.filename} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Summary
                </CardTitle>
                {document.summary_generated_at && (
                  <Badge variant="secondary">
                    Generated: {new Date(document.summary_generated_at).toLocaleDateString()}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {document.summary ? (
                  <div className="prose max-w-none">
                    <p className="text-muted-foreground leading-relaxed">
                      {document.summary}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No summary available for this document.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="query" className="space-y-4">
            <Card className="h-[calc(100vh-200px)]">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  AI Assistant
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ask questions about this specific document and get AI-powered answers
                </p>
              </CardHeader>
              <CardContent className="h-full p-0">
                <div className="h-full flex flex-col">
                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6 max-w-4xl mx-auto">
                      {messages.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                          <div className="bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                          <p className="text-sm text-muted-foreground">Ask me anything about this document and I'll help you understand it better.</p>
                          <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setInput("What is this document about?")}
                            >
                              What is this document about?
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setInput("Summarize the key points")}
                            >
                              Summarize the key points
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setInput("What are the main conclusions?")}
                            >
                              What are the main conclusions?
                            </Button>
                          </div>
                        </div>
                      )}
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex gap-4 ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {message.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-lg p-4 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground ml-12"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <div className="prose prose-sm max-w-none">
                              <p className="mb-0 whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </div>
                          {message.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium">You</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-4 justify-start">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <div className="bg-muted text-foreground rounded-lg p-4 max-w-[85%]">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              <span className="text-sm text-muted-foreground">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="p-6 border-t bg-background">
                    <div className="max-w-4xl mx-auto">
                      <div className="flex gap-3">
                        <Input
                          placeholder="Ask a question about this document..."
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                          className="flex-1 min-h-[48px] text-base"
                          disabled={isLoading}
                        />
                        <Button 
                          onClick={handleSend} 
                          size="lg" 
                          disabled={isLoading || !input.trim()}
                          className="px-6"
                        >
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Press Enter to send, Shift+Enter for new line
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
