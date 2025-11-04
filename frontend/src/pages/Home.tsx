import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Header } from "@/components/Header";
import { DocumentCard, Document } from "@/components/DocumentCard";
import { apiService, Document as ApiDocument, QueryResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PDFModal } from "@/components/PDFModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: QueryResponse['sources'] }>>([]);
  const [input, setInput] = useState<string>("");
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDocId, setModalDocId] = useState<string>("");
  const [modalDocTitle, setModalDocTitle] = useState<string>("");
  const [modalInitialPage, setModalInitialPage] = useState<number | undefined>(undefined);
  useEffect(() => {
    loadDocuments();
    loadFavorites();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDocuments();
      const formattedDocs = data.results.map((apiDoc: ApiDocument) => ({
        id: apiDoc.id,
        title: apiDoc.title || apiDoc.filename,
        summary: apiDoc.summary || "No summary available",
        isFavorite: false,
      }));
      const uniqueDocs = formattedDocs.filter((doc, index, self) => index === self.findIndex(d => d.id === doc.id));
      setDocuments(uniqueDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({ title: "Error", description: "Failed to load documents. Please try again.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const loadFavorites = async () => {
    try {
      const token = await getToken();
      const favorites = await apiService.getFavorites(token);
      const favoriteIds = new Set(favorites.map(fav => fav.document.id));
      setDocuments(prev => prev.map(doc => ({ ...doc, isFavorite: favoriteIds.has(doc.id) })));
      setSearchResults(prev => prev.map(doc => ({ ...doc, isFavorite: favoriteIds.has(doc.id) })));
    } catch (error) {
      console.log('Favorites check skipped (user not authenticated)');
    }
  };

  const handleToggleFavorite = async (doc: Document) => {
    try {
      const token = await getToken();
      if (!token) {
        toast({ title: "Authentication Required", description: "Please sign in to manage favorites.", variant: "destructive" });
        return;
      }
      if (doc.isFavorite) await apiService.removeFavorite(doc.id, token); else await apiService.addFavorite(doc.id, token);
      const updated = !doc.isFavorite;
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, isFavorite: updated } : d));
      setSearchResults(prev => prev.map(d => d.id === doc.id ? { ...d, isFavorite: updated } : d));
      toast({ title: updated ? "Added to Favorites" : "Removed from Favorites", description: `"${doc.title}" has been ${updated ? 'added to' : 'removed from'} your favorites.` });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({ title: "Error", description: "Failed to update favorites. Please try again.", variant: "destructive" });
    }
  };

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const token = await getToken();
    const resp = await apiService.createConversation(token || undefined);
    setConversationId(resp.conversation_id);
    return resp.conversation_id;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoadingChat) return;
    const userMsg = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    const content = input;
    setInput("");
    setIsLoadingChat(true);
    try {
      const convId = await ensureConversation();
      const token = await getToken();
      const resp = await apiService.sendChatMessage(convId!, content, token || undefined);
      const assistantMsg = { role: 'assistant' as const, content: resp.answer, sources: resp.sources };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally { setIsLoadingChat(false); }
  };

  const openCitationModal = (sourceIndex: number) => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.sources && m.sources.length > 0);
    const src = lastAssistant?.sources?.[sourceIndex];
    if (!src) return;
    setModalDocId(src.document_id);
    const meta = documents.find(d => d.id === src.document_id);
    setModalDocTitle(meta?.title || 'Document');
    setModalInitialPage(src.page);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        {/* Intro */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Your AI-Powered Pdf Hub</h1>
          <p className="text-lg text-muted-foreground mb-2 max-w-2xl mx-auto">Chat to ask questions across all PDFs. Answers include citations that open at the exact page.</p>
        </div>

        {/* Chat Thread */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="border rounded-lg bg-card">
            <div className="p-6 space-y-6">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p>Start by asking a question about your PDFs.</p>
                </div>
              )}
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-4 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs text-muted-foreground mr-2">Citations:</span>
                        <div className="flex flex-wrap gap-2">
                          {m.sources.slice(0, 5).map((_, sIdx) => (
                            <Button key={sIdx} size="sm" variant="outline" onClick={() => openCitationModal(sIdx)}>
                              [{sIdx + 1}]
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="border-t p-6">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Ask anything about your PDFs..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 min-h-[48px] text-base"
                  disabled={isLoadingChat}
                />
                <Button onClick={sendMessage} size="lg" disabled={isLoadingChat || !input.trim()} className="px-6">
                  {isLoadingChat ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <span>Send</span>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </div>
        </div>

        {/* Sources from last assistant message */}
        {(() => {
          const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.sources && m.sources.length > 0);
          const sources = (lastAssistant?.sources || []).slice(0, 5);
          return sources.length > 0 ? (
            <div className="mb-12 max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6">Sources</h2>
              <div className="space-y-4">
                {sources.map((src, idx) => (
                  <div key={`${src.document_id}-${src.chunk_index}`} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground mb-1">Source [{idx + 1}]</div>
                        <p className="text-sm leading-relaxed">{src.text_preview}</p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Final Score: {((((src.semantic_score ?? src.score ?? 0) * 0.6) + ((src.tfidf_score ?? 0) * 0.3) + ((src.keyword_score ?? 0) * 0.1)) * 100).toFixed(1)}%
                          {src.page ? ` • Page ${src.page}` : ''}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {src.semantic_score !== undefined && <span>Cosine: {(src.semantic_score * 100).toFixed(1)}%</span>}
                          {src.keyword_score !== undefined && <> • Keyword: {(src.keyword_score * 100).toFixed(1)}%</>}
                          {src.tfidf_score !== undefined && <> • TF-IDF: {(src.tfidf_score * 100).toFixed(1)}%</>}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.location.assign(`/document/${src.document_id}`)}>Open in Document Page</Button>
                        <Button variant="outline" size="sm" onClick={() => openCitationModal(idx)}>Open Preview</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Documents Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Recent Documents</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading documents...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchResults.length > 0 ? searchResults : documents).map((doc) => (
                <DocumentCard key={doc.id} document={doc} onToggleFavorite={handleToggleFavorite} />
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

      {/* Citation Modal */}
      <PDFModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} documentTitle={modalDocTitle} documentId={modalDocId} initialPage={modalInitialPage} />
    </div>
  );
}
