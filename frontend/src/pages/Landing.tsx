import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Search, 
  MessageSquare, 
  Heart, 
  History, 
  Download,
  Brain,
  Zap,
  Shield,
  Users,
  ArrowRight,
  CheckCircle
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: <Search className="h-8 w-8" />,
      title: "Smart Document Search",
      description: "Powerful semantic search across all your PDF documents with AI-powered relevance ranking."
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "AI-Powered Q&A",
      description: "Ask questions about your documents and get intelligent answers with source citations."
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "PDF Viewer & Analysis",
      description: "View PDFs directly in the browser with integrated summarization and analysis tools."
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Favorites Management",
      description: "Save important documents to your favorites for quick access and organization."
    },
    {
      icon: <History className="h-8 w-8" />,
      title: "Search History",
      description: "Track your search queries and easily revisit previous research sessions."
    },
    {
      icon: <Download className="h-8 w-8" />,
      title: "Document Download",
      description: "Download any document directly from the platform with a single click."
    }
  ];

  const benefits = [
    {
      icon: <Brain className="h-6 w-6 text-primary" />,
      title: "AI-Powered Intelligence",
      description: "Advanced machine learning algorithms understand your documents' content and context."
    },
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: "Lightning Fast",
      description: "Get instant search results and responses powered by optimized vector databases."
    },
    {
      icon: <Shield className="h-6 w-6 text-primary" />,
      title: "Secure & Private",
      description: "Your documents and data are protected with enterprise-grade security measures."
    },
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      title: "User-Friendly",
      description: "Intuitive interface designed for researchers, students, and professionals."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">RAG Retrieval</span>
          </div>
          <div className="flex items-center gap-3">
            <SignInButton mode="modal">
              <Button variant="ghost">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Get Started</Button>
            </SignUpButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
            Your AI-Powered Document Intelligence Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Transform how you interact with documents. Search, analyze, and get intelligent insights from your PDF collection using advanced AI technology.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <SignUpButton mode="modal">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Free Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-spacing bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for Document Management
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to unlock the full potential of your document collection
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover-lift border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-spacing">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose RAG Retrieval?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Built with cutting-edge AI technology to provide the most intelligent and efficient document management experience.
              </p>
              <div className="space-y-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Card className="p-8 shadow-2xl border-0 bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-lg">Upload PDF Documents</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-lg">AI-Powered Search & Analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-lg">Intelligent Q&A System</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-lg">Personal History & Favorites</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-lg">Secure Cloud Storage</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacing bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Document Workflow?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of researchers, students, and professionals who are already using RAG Retrieval to unlock insights from their documents.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <SignUpButton mode="modal">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </SignUpButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-muted/30">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">RAG Retrieval</span>
          </div>
          <p className="text-muted-foreground">
            © 2025 RAG Retrieval. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}