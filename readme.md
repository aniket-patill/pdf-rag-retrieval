# RAG Document Retrieval System

A full-stack application for intelligent document search and AI-powered Q&A using Retrieval-Augmented Generation (RAG).

## Features

✨ **Smart Document Search** - Semantic search using vector embeddings  
🤖 **AI-Powered Q&A** - Ask questions about documents using Google Gemini  
📄 **PDF Viewer** - Built-in PDF viewer with navigation  
⭐ **Favorites** - Save your favorite documents  
📜 **Search History** - Track your searches  
🔐 **User Authentication** - Clerk integration for secure auth  

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Django 5, Django REST Framework, ChromaDB, Google Gemini API |
| **Frontend** | React 18, Vite, TypeScript, Shadcn UI, Clerk |
| **Database** | SQLite |
| **PDF Processing** | PyMuPDF |

## Prerequisites

- Python 3.10+
- Node.js 18+
- Google Gemini API key ([get one here](https://ai.google.dev))
- Clerk account ([sign up here](https://clerk.com))

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file (see below)
```

**Create `backend/.env`:**
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# API Keys
GEMINI_API_KEY=your-google-gemini-api-key
CLERK_SECRET_KEY=your-clerk-secret-key

# Optional: Custom paths (defaults shown)
CHROMADB_PATH=chroma_db
PDFS_PATH=pdfs
```

```bash
# Run migrations
python manage.py migrate

# Create pdfs folder and add your PDF files
mkdir pdfs
# Place your PDF files in the pdfs folder

# Ingest PDFs into the system
python manage.py ingest_pdfs

# Start backend server (runs on http://localhost:8000)
python run.py
```

### 2. Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install

# Create .env file (see below)
```

**Create `frontend/.env`:**
```env
VITE_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
```

```bash
# Start development server (runs on http://localhost:5173)
npm run dev
```

## Usage

1. **Add Documents**: Place PDF files in `backend/pdfs/` and run `python manage.py ingest_pdfs`
2. **Search**: Use the search bar to find relevant documents
3. **Ask Questions**: Click a document and ask questions about it
4. **Save Favorites**: Click the star icon to save documents
5. **View History**: See your previous searches

## Management Commands

Run these commands from the `backend` directory:

```bash
# Ingest all PDFs
python manage.py ingest_pdfs

# Clean all data and re-ingest PDFs
python manage.py clean_and_reingest --confirm

# Clear only embeddings
python manage.py clear_embeddings --confirm

# Generate document summaries
python manage.py generate_summaries
```

## API Endpoints

### Documents
- `GET /api/docs/` - List documents
- `GET /api/docs/{id}/` - Get document details
- `GET /api/docs/{id}/summary/` - Get document summary
- `GET /api/docs/{id}/file/` - Download PDF file

### Search & Query
- `POST /api/search/` - Search documents
- `POST /api/docs/query/` - Ask questions (requires authentication)

### User Features
- `GET /api/favorites/` - Get saved favorites
- `POST /api/favorites/` - Add favorite
- `DELETE /api/favorites/{id}/` - Remove favorite
- `GET /api/history/` - Get search history

## Troubleshooting

| Issue | Solution |
|-------|----------|
| PDFs not ingesting | Ensure `GEMINI_API_KEY` is valid and ChromaDB path is writable |
| API 401 errors | Check that Clerk secret key is correct and JWT tokens are sent |
| CORS errors | Verify `CORS_ALLOWED_ORIGINS` in `backend/rag_backend/settings.py` |
| PDF viewer blank | Check browser console for worker errors, ensure PDF is accessible |

## Project Structure

```
.
├── backend/
│   ├── documents/          # Document management & AI services
│   ├── favorites/          # User favorites
│   ├── rag_backend/        # Django settings
│   ├── requirements.txt
│   └── run.py              # Startup script
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities & API client
│   │   └── hooks/          # Custom React hooks
│   └── package.json
│
└── README.md
```

## Development

```bash
# Terminal 1: Backend
cd backend
python run.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

## License

MIT
