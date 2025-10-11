# RAG Backend

A Django backend for the RAG (Retrieval-Augmented Generation) application that provides AI-powered document search and Q&A capabilities.

## Features

- **Document Processing**: Automatic PDF text extraction and chunking
- **Vector Search**: ChromaDB integration for semantic search
- **AI Integration**: Google Gemini 2.5 Flash for summarization and Q&A
- **Authentication**: Clerk JWT token validation
- **REST API**: Clean JSON endpoints for frontend integration

## Tech Stack

- Django 5.0 + Django REST Framework
- ChromaDB for vector embeddings
- Google Gemini 2.5 Flash for AI operations
- PyMuPDF for PDF processing
- Clerk for authentication

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `GEMINI_API_KEY`: Your Google Gemini API key
- `CLERK_SECRET_KEY`: Your Clerk secret key
- `SECRET_KEY`: Django secret key

### 3. Database Setup

```bash
python manage.py migrate
```

### 4. PDF Ingestion

Place your PDF files in the `pdfs/` directory, then run:

```bash
python manage.py ingest_pdfs
```

This will:
- Extract text from all PDFs
- Split text into chunks
- Generate embeddings
- Store in ChromaDB

### 5. Run Server

```bash
python manage.py runserver
```

## API Endpoints

### Documents
- `GET /api/docs/` - List all documents
- `GET /api/docs/<id>/` - Get document details
- `GET /api/docs/<id>/summary/` - Get document summary

### Search & Query
- `POST /api/search/` - Search documents
- `POST /api/docs/query/` - Ask questions (requires auth)

### Favorites (Authenticated)
- `GET /api/favorites/` - List user favorites
- `POST /api/favorites/` - Add to favorites
- `DELETE /api/favorites/<id>/` - Remove from favorites

## Authentication

The backend uses Clerk JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-clerk-jwt-token>
```

## Management Commands

### Ingest PDFs
```bash
python manage.py ingest_pdfs
```

### Clear All Data
```bash
python manage.py clear_embeddings --confirm
```

## Project Structure

```
backend/
├── rag_backend/          # Django project settings
├── documents/            # Documents app
│   ├── services/        # PDF, ChromaDB, Gemini services
│   ├── management/      # Management commands
│   └── ...
├── favorites/           # Favorites app
├── requirements.txt
├── .env.example
└── README.md
```

## Development

### Adding New PDFs
1. Place PDF files in `pdfs/` directory
2. Run `python manage.py ingest_pdfs`

### Customizing Chunk Size
Modify `EmbeddingService` in `documents/services/embedding_service.py`:
- `chunk_size`: Maximum characters per chunk (default: 1000)
- `chunk_overlap`: Overlap between chunks (default: 200)

### API Response Format
All endpoints return JSON responses with consistent error handling:

```json
{
  "data": {...},
  "error": "Error message if any"
}
```

## Troubleshooting

### Common Issues

1. **ChromaDB Connection Error**: Ensure the `CHROMADB_PATH` directory exists and is writable
2. **PDF Processing Error**: Check that PDFs are not corrupted and PyMuPDF can read them
3. **Gemini API Error**: Verify your `GEMINI_API_KEY` is valid and has sufficient quota
4. **Clerk Authentication Error**: Ensure `CLERK_SECRET_KEY` matches your Clerk application

### Logs
Check Django logs in `logs/django.log` for detailed error information.
