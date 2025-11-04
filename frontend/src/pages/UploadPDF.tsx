import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiService, Document } from "@/lib/api";

export default function UploadPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load user documents on component mount
  useEffect(() => {
    loadUserDocuments();
  }, []);

  const loadUserDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const token = await getToken();
      const documents = await apiService.getUserDocuments(token);
      setUserDocuments(documents);
    } catch (error) {
      console.error('Error loading user documents:', error);
      toast({
        title: "Error",
        description: "Failed to load your documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.pdf')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file.",
          variant: "destructive"
        });
        return;
      }
      
      // Changed limit to 10MB as requested
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }
      
      // Check minimum size (100KB)
      if (selectedFile.size < 100 * 1024) {
        toast({
          title: "File Too Small",
          description: "Please select a file larger than 100KB.",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a PDF file to upload.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const token = await getToken();
      const result = await apiService.uploadPdf(file, token);
      
      toast({
        title: "Success",
        description: "PDF uploaded and processed successfully!"
      });
      
      // Add the new document to the list
      setUserDocuments(prev => [result.document, ...prev]);
      
      // Clear the file selection
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, documentTitle: string) => {
    try {
      const token = await getToken();
      await apiService.deleteDocument(documentId, token);
      
      // Remove from local state
      setUserDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      toast({
        title: "Success",
        description: `"${documentTitle}" has been deleted successfully.`
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Upload PDF Document</CardTitle>
              <CardDescription>
                Upload a PDF file to make it searchable in your document hub.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pdf-upload">Select PDF File</Label>
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  <p className="text-sm text-muted-foreground">
                    File size: 100KB - 10MB. Only PDF files are accepted.
                  </p>
                </div>

                {file && (
                  <div className="rounded-md border p-4">
                    <h3 className="font-medium">Selected File</h3>
                    <p className="text-sm text-muted-foreground truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={handleUpload} 
                    disabled={!file || isUploading}
                    size="lg"
                  >
                    {isUploading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Uploading...
                      </>
                    ) : (
                      "Upload PDF"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* User Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Uploaded Documents</CardTitle>
              <CardDescription>
                Manage your uploaded PDF documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDocuments ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading your documents...</p>
                </div>
              ) : userDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You haven't uploaded any documents yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{doc.title || doc.filename}</h3>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/document/${doc.id}`)}
                        >
                          View
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id, doc.title || doc.filename)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              After uploading, your PDF will be processed and made searchable.
              You can then ask questions about its content using the chat interface.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}