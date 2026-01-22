# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Noteably is an AI-powered study material generator that transforms audio/video/PDF content into structured study materials (summaries, notes, flashcards, quizzes). Full-stack application with Django backend and React/Vite frontend, using Supabase for auth/database/storage, AssemblyAI for transcription, and Google Gemini for content generation.

## Development Commands

### Backend (Django)

```bash
cd backend
source venv/bin/activate

python manage.py runserver        # Start dev server (Daphne ASGI, port 8000)
python manage.py migrate          # Apply migrations
python manage.py test             # Run tests

# Celery worker (requires Redis running)
celery -A config worker --loglevel=info

# Docker (runs Daphne + Celery + Redis)
docker-compose up --build
```

### Frontend (React/Vite)

```bash
cd frontend
npm run dev      # Start dev server (port 5173)
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

### Backend Structure (`backend/apps/`)

- **core/** - Shared utilities: custom exceptions (`NoteablyException` hierarchy), Supabase client singleton, `@retry_with_backoff` decorator, WebSocket consumers/routing, Django signals for real-time updates
- **accounts/** - Supabase JWT auth middleware, permission classes (`IsAuthenticated`, `IsPaidUser`, `IsOwner`)
- **ingestion/** - File upload endpoint, Job model with status tracking, quota management, Supabase Storage integration
- **transcription/** - AssemblyAI integration for audio/video
- **generation/** - Gemini 2.0 Flash integration, prompt templates, JSON parsing with markdown fallback
- **export/** - Markdown, JSON, PDF formatters with ReportLab

### Frontend Structure (`frontend/src/`)

- **pages/** - Route components (Dashboard, Upload, StudySetDetail, Notes, Flashcards, Quizzes, Profile)
- **components/ui/** - Radix UI + Tailwind wrapper components
- **contexts/** - AuthContext (Supabase auth state), WebSocketContext (real-time job updates)
- **hooks/** - useAuth, useJobs, useContent, useExport, useQuizAttempts, useWebSocket
- **lib/api/services/** - Typed API clients (auth.ts, jobs.ts, content.ts, export.ts, quiz.ts)
- **types/** - TypeScript interfaces (models.ts, api.ts, components.ts)

### Data Flow

1. User uploads file via `POST /api/process`
2. Backend stores file in Supabase Storage, creates Job record
3. Celery task: transcribes via AssemblyAI (audio/video) OR extracts text via pypdf (PDF)
4. Celery task: generates materials via Gemini (updates job.status for each material type)
5. Django signals broadcast job updates via WebSocket to `user_{user_id}` channel group
6. Frontend receives real-time updates via WebSocketContext

### Job Status Progression

`queued` → `transcribing`/`extracting_text` → `generating_summary` → `generating_notes` → `generating_flashcards` → `generating_quiz` → `completed`/`failed`

## Key Patterns

### Backend

- **Authentication**: Supabase JWT validated by middleware → `request.user_id` available in views
- **Error handling**: Use custom exceptions from `apps/core/exceptions.py`, wrap external calls with `@retry_with_backoff`
- **Database**: Access via `apps/core/supabase_client.py` singleton
- **Real-time updates**: Django signals on Job.post_save trigger WebSocket broadcasts

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
- **Data fetching**: TanStack Query with 5-minute stale time, retry: 1
- **Real-time**: `useWebSocket()` hook for job status updates with auto-reconnect (3s)
- **Protected routes**: Wrap with `ProtectedRoute` component
- **Styling**: Tailwind CSS, Radix UI primitives

### Material Type Aliasing

Frontend sends "quizzes" but backend stores/returns "quiz". Handle this mapping in serializers.

## API Endpoints

```
POST   /api/process                  Upload file, returns job_id + estimated_time
GET    /api/jobs/                    List jobs (?limit=N)
GET    /api/jobs/<uuid>/             Get single job details
GET    /api/jobs/<uuid>/signed-url/  Get signed URL for file access (24h expiry)
GET    /api/dashboard/               Dashboard stats
GET    /api/content/<job_id>         Get generated content
GET    /api/content/<job_id>/attempts Get quiz attempts
POST   /api/content/<job_id>/attempts Save quiz attempt
POST   /api/export                   Export (markdown/json/pdf)
GET    /api/auth/me                  Current user profile
GET    /api/auth/subscription        Subscription status & limits
WS     /ws/user/?token=<jwt>         Real-time job updates
GET    /health/                      Health check (no auth)
```

## Environment Variables

Backend requires: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `ASSEMBLYAI_API_KEY`, `GEMINI_API_KEY`, `REDIS_URL`

Frontend requires: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`