import { SignUp as ClerkSignUp } from "@clerk/clerk-react";
import { FileText } from "lucide-react";

export default function SignUp() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Join RAG Retrieval</h1>
          <p className="text-muted-foreground">
            Start your AI-powered document intelligence journey
          </p>
        </div>

        <div className="flex justify-center">
          <ClerkSignUp 
            routing="path" 
            path="/sign-up"
            signInUrl="/sign-in"
            afterSignUpUrl="/"
          />
        </div>
      </div>
    </div>
  );
}
