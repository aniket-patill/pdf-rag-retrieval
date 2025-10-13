import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { apiService, Conversation, ChatMessage } from "@/lib/api";
import { PDFModal } from "@/components/PDFModal";

export default function History() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  // Chat conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  // Citation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDocId, setModalDocId] = useState<string>("");
  const [modalDocTitle, setModalDocTitle] = useState<string>("Document");
  const [modalInitialPage, setModalInitialPage] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const token = await getToken();
      if (!token) {
        setConversations([]);
        return;
      }
      const convs = await apiService.listConversations(token);
      setConversations(convs);
      // Auto-select the most recent conversation
      if (convs.length > 0) {
        selectConversation(convs[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({ title: "Error", description: "Failed to load conversations.", variant: "destructive" });
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = async (convId: string) => {
    try {
      setSelectedConversationId(convId);
      setLoadingMessages(true);
      const token = await getToken();
      const msgs = await apiService.getConversationMessages(convId, token || undefined);
      setConversationMessages(msgs);
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      toast({ title: "Error", description: "Failed to load messages.", variant: "destructive" });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      const token = await getToken();
      await apiService.deleteConversation(convId, token || undefined);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (selectedConversationId === convId) {
        setSelectedConversationId(null);
        setConversationMessages([]);
      }
      toast({ title: "Conversation Deleted", description: "Chat conversation removed." });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({ title: "Error", description: "Failed to delete conversation.", variant: "destructive" });
    }
  };

  const openCitationModal = (sourceIndex: number) => {
    // Find the latest assistant message in the selected conversation
    const assistantMsgs = conversationMessages.filter(m => m.role === 'assistant' && Array.isArray(m.citations) && m.citations.length > 0);
    const lastAssistant = assistantMsgs[assistantMsgs.length - 1];
    const src = lastAssistant?.citations?.[sourceIndex];
    if (!src) return;
    setModalDocId(src.document_id);
    setModalDocTitle('Document');
    setModalInitialPage(src.page);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Chat History Section */}
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Chat History</h1>
        </div>

        {loadingConversations ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No conversations yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversations List */}
            <div className="lg:col-span-1">
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <Card key={conv.id} className={`${selectedConversationId === conv.id ? 'border-primary' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => selectConversation(conv.id)}>
                          <div className="font-medium line-clamp-1">{conv.title || `Conversation ${conv.id}`}</div>
                          <div className="text-sm text-muted-foreground">{new Date(conv.updated_at).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteConversation(conv.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  {loadingMessages ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-muted-foreground">Loading messages...</p>
                    </div>
                  ) : conversationMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No messages in this conversation.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {conversationMessages.map((m) => (
                        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-lg p-4 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                            {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                              <div className="mt-3">
                                <span className="text-xs text-muted-foreground mr-2">Citations:</span>
                                <div className="flex flex-wrap gap-2">
                                  {m.citations.map((_, idx) => (
                                    <Button key={idx} size="sm" variant="outline" onClick={() => openCitationModal(idx)}>
                                      [{idx + 1}]
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Citation Modal */}
      <PDFModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        documentTitle={modalDocTitle}
        documentId={modalDocId}
        initialPage={modalInitialPage}
      />
    </div>
  );
}
