# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Noteably is an AI-powered study material generator that transforms audio/video content into structured study materials (summaries, notes, flashcards, quizzes). Full-stack application with Django backend and React/Vite frontend, using Supabase for auth/database, Cloudflare R2 for storage, AssemblyAI for transcription, and Google Gemini for content generation.

## Development Commands

### Backend (Django)

```bash
cd backend
source venv/bin/activate          # Activate virtual environment

python manage.py runserver        # Start dev server (port 8000)
python manage.py test             # Run tests
python manage.py migrate          # Apply migrations

# Code quality (not pre-configured)
black apps/                       # Format
flake8 apps/                      # Lint
mypy apps/                        # Type check

# Celery worker (requires Redis)
celery -A config worker --loglevel=info
```

### Frontend (React/Vite)

```bash
cd frontend
npm run dev      # Start dev server (port 5173)
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture

### Backend Structure (`backend/apps/`)

- **core/** - Shared utilities, custom exceptions (`NoteablyException` hierarchy), Supabase client singleton, `@retry_with_backoff` decorator
- **accounts/** - Supabase JWT auth middleware, permission classes (`IsAuthenticated`, `IsPaidUser`, `IsOwner`)
- **ingestion/** - File upload endpoint, Cloudflare R2 storage, Job model for pipeline tracking
- **transcription/** - AssemblyAI integration with streaming support
- **generation/** - Google Gemini LLM integration for content generation
- **tasks/** - Celery background job definitions

### Frontend Structure (`frontend/src/`)

- **pages/** - Route components (Dashboard, Upload, Notes, Flashcards, Quizzes, Profile)
- **components/ui/** - Radix UI + Tailwind wrapper components
- **contexts/AuthContext.tsx** - Global Supabase auth state
- **router/** - React Router v7 route definitions
- **lib/** - API clients, utilities, Supabase client
- **types/** - TypeScript interfaces

### Data Flow

1. User uploads file via `POST /api/process`
2. Backend stores file in Cloudflare R2, creates Job record
3. Celery task transcribes via AssemblyAI (streaming updates)
4. Celery task generates materials via Gemini
5. Frontend polls or uses WebSocket for status updates

## Key Patterns

### Backend

- **Authentication**: Supabase JWT validated by middleware → `request.user_id` available in views
- **Error handling**: Use custom exceptions from `apps/core/exceptions.py`, wrap external calls with `@retry_with_backoff`
- **Database**: Access via `apps/core/supabase_client.py` singleton, respects Row-Level Security

```python
from apps.core.error_handler import retry_with_backoff
from apps.accounts.permissions import IsAuthenticated

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def my_view(request):
    user_id = request.user_id  # From middleware
```

### Frontend

- **Auth**: `useAuth()` hook from AuthContext
- **Data fetching**: TanStack Query with 5-minute stale time
- **Protected routes**: Wrap with `ProtectedRoute` component
- **Styling**: Tailwind CSS, Radix UI primitives

## API Endpoints

```
POST   /api/process           Upload file, start processing pipeline
GET    /api/content           List user's generated content
POST   /api/export            Export materials (PDF/Markdown/JSON)
GET    /api/auth/me           Get current user profile
GET    /api/auth/subscription Get subscription status
WS     /api/stream/{job_id}   Real-time processing updates
GET    /health/               Health check (no auth)
```

## Environment Variables

Backend requires: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `ASSEMBLYAI_API_KEY`, `GEMINI_API_KEY`

Frontend requires: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`