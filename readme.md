# RAG Retrieval Project

A full-stack Retrieval-Augmented Generation platform for smart document search and AI-powered Q&A.

- Smart Document Search (semantic retrieval)
- AI-Powered Q&A (Google Gemini 2.5 Flash)
- PDF Viewer & Analysis (React PDF)
- Favorites Management
- Search History
- Document Download

## Tech Stack

- Backend: Django 5, Django REST Framework, PyMuPDF, ChromaDB, google-generativeai, Clerk JWT middleware
- Frontend: React + Vite + TypeScript, shadcn/ui, react-pdf, Clerk
- Database: SQLite (default)
- Auth: Clerk (JWT in backend, ClerkProvider in frontend)

## Repository Structure

```
.
├── backend
│   ├── documents (models, views, services, management commands)
│   ├── favorites (favorites feature)
│   ├── rag_backend (Django project settings/urls)
│   ├── requirements.txt
│   ├── run.py
│   └── FRONTEND_INTEGRATION.md
└── frontend
    ├── src (components, pages, lib, hooks)
    ├── package.json
    └── vite.config.ts
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+ or pnpm
- Google Gemini API key
- Clerk application (Publishable key + Secret key)
- Optional: ChromaDB (for semantic search). If installation fails on your machine, see the ChromaDB notes below.

## Quick Start

1. Backend setup
2. Frontend setup
3. Ingest PDFs
4. Run both servers
5. Use the app at the frontend URL

---

## Backend Setup (Django)

1) Create and activate a virtual environment

- Windows (cmd):
  - `python -m venv venv`
  - `venv\Scripts\activate`

- macOS/Linux:
  - `python3 -m venv venv`
  - `source venv/bin/activate`

2) Install dependencies

- `pip install -r backend/requirements.txt`

Note on ChromaDB:
- The project uses ChromaDB for vector search. If installation is commented or fails, install explicitly:
  - `pip install chromadb==0.4.22`
- If you encounter build issues, ensure you have a C++ build toolchain installed or use a prebuilt wheel if available.

3) Create .env in backend/

Create `backend/.env` with:

```
SECRET_KEY=your-django-secret
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
GEMINI_API_KEY=your-gemini-key
CLERK_SECRET_KEY=your-clerk-secret
CHROMADB_PATH=optional/custom/path (default: backend/chroma_db)
PDFS_PATH=optional/custom/path (default: backend/pdfs)
```

4) Apply database migrations

- `cd backend`
- `python manage.py migrate`

5) Prepare PDFs directory

- Create `backend/pdfs` and place your `.pdf` files inside

6) Start the backend

- Option A (recommended): `python backend/run.py`
- Option B: `cd backend && python manage.py runserver 0.0.0.0:8000`

Backend base URL: `http://localhost:8000/api`

### Management Commands

Run from `backend` directory:

- Ingest all PDFs:
  - `python manage.py ingest_pdfs`
  - Options: `--force`, `--pdfs-path=PATH`

- Clean and reingest (destructive):
  - `python manage.py clean_and_reingest --confirm`
  - Optional: `--keep-history`, `--generate-summaries`, `--summary-length=1500`

- Clear all embeddings and documents (destructive):
  - `python manage.py clear_embeddings --confirm`

- Generate summaries:
  - `python manage.py generate_summaries`
  - Options: `--force`, `--document-id=DOC_ID`

### API Endpoints (summary)

- Documents:
  - `GET /api/docs/`
  - `GET /api/docs/{document_id}/`
  - `GET /api/docs/{document_id}/summary/`
  - `GET /api/docs/{document_id}/file/`

- Search:
  - `POST /api/search/`  `{ query, limit }`

- Q&A (requires auth token):
  - `POST /api/docs/query/`  `{ query, document_ids? }`

- Favorites:
  - `GET /api/favorites/`          (unauthenticated returns [])
  - `POST /api/favorites/add/`     (requires auth)
  - `DELETE /api/favorites/{document_id}/`  (requires auth)

- History:
  - `GET /api/history/`
  - `GET /api/history/debug/`
  - `DELETE /api/history/{id}/`

Notes:
- Mixed authentication design: unauthenticated GETs for user-specific lists return empty arrays; POST/DELETE require auth.

---

## Frontend Setup (React + Vite)

1) Install dependencies

- `cd frontend`
- `npm install`

2) Create `.env` file in `frontend/`

Create `frontend/.env` with:

```
VITE_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
```

3) Start the dev server

- `npm run dev`
- Default dev URL: `http://localhost:5173`

4) Build for production

- `npm run build`
- Preview locally:
  - `npm run preview`

### Frontend configuration notes

- API base is hardcoded to `http://localhost:8000/api` in `src/lib/api.ts`. Adjust if your backend runs elsewhere.
- PDF viewer uses `react-pdf` and a CDN-served PDF.js worker; no extra worker configuration is required.
- CORS origins allowed by backend (`rag_backend/settings.py`) include localhost ports 3000 and 5173. Update `CORS_ALLOWED_ORIGINS` if your dev port differs.

---

## Development Workflow

- Start backend first:
  - `python backend/run.py`
- Start frontend next:
  - `npm run dev` (from `frontend`)

- Ingest PDFs before using search/Q&A:
  - `python manage.py ingest_pdfs`

- Monitor logs:
  - Backend prints to console; file logging is configured to `backend/logs/django.log` (ensure folder exists)

- Testing (backend):
  - `pytest`
  - `pytest-django` included

- Lint/format (backend):
  - `black .`
  - `flake8`

---

## ChromaDB Installation Notes

- If `chromadb` installation is commented or fails on your machine:
  - `pip install chromadb==0.4.22`
- On some platforms you may need additional build tools. If installation still fails, you can temporarily disable ingestion commands that depend on ChromaDB, but semantic search and Q&A will be limited.

---

## Troubleshooting

- PDF not loading in frontend:
  - Ensure backend `/api/docs/{id}/file/` returns 200 and headers include `Accept-Ranges`
  - Check PDF URL accessibility and worker logs in browser console

- 401 on favorites or Q&A:
  - Ensure `Authorization: Bearer <Clerk JWT>` is set
  - Backend requires `CLERK_SECRET_KEY` for token verification

- Gemini errors:
  - Verify `GEMINI_API_KEY` is valid and set in `backend/.env`

- CORS issues:
  - Confirm `CORS_ALLOWED_ORIGINS` in `rag_backend/settings.py` matches your frontend origin

---

## License

MIT (or set your preferred license)
