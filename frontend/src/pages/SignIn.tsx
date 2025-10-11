import { SignIn as ClerkSignIn } from "@clerk/clerk-react";
import { FileText } from "lucide-react";

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to RAG Retrieval</h1>
          <p className="text-muted-foreground">
            Your AI-powered document intelligence platform
          </p>
        </div>

        <div className="flex justify-center">
          <ClerkSignIn 
            routing="path" 
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/"
          />
        </div>
      </div>
    </div>
  );
}
