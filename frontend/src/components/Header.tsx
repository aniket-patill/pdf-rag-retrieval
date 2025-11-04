import { Link, useNavigate } from "react-router-dom";
import { FileText, History, Heart, Upload, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { UserButton, useUser } from "@clerk/clerk-react";

export function Header() {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  if (!isSignedIn) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">RAG Retrieval</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-1">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="hover:bg-surface-hover"
          >
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/upload")}
            className="hover:bg-surface-hover"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/history")}
            className="hover:bg-surface-hover"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/favorites")}
            className="hover:bg-surface-hover"
          >
            <Heart className="h-4 w-4 mr-2" />
            Favorites
          </Button>
        </nav>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
