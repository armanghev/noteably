# Noteably [![wakatime](https://wakatime.com/badge/user/4a2c04a0-e17f-4c55-8202-8dcc0ed8e240/project/e1506398-8580-4123-965a-c5ee42cc3fbc.svg)](https://wakatime.com/badge/user/4a2c04a0-e17f-4c55-8202-8dcc0ed8e240/project/e1506398-8580-4123-965a-c5ee42cc3fbc)

**AI-Powered Study Material Generator**

Noteably transforms videos, meetings, and documents into structured study materials automatically. Upload content, get instant transcriptions, summaries, notes, flashcards, and quizzes.

---

## Project Status: Fresh Start 🚀

This project has been restarted from scratch using the **RPG (Repository Planning Graph) Method** for structured, dependency-aware development.

### Quick Links
- 📋 [**Product Requirements Document (PRD)**](./docs/PRD.md) - Comprehensive project specification using RPG methodology
- 🎯 Target Users: Students, professionals, educators
- 🛠️ Tech Stack: Django + Next.js + AI (Gemini, Claude, OpenAI, AssemblyAI)

---

## What is Noteably?

Noteably solves a critical problem: **students and professionals waste hours creating study materials from educational content**. Our solution:

1. **Upload** any content (YouTube URL, audio/video file, PDF, or text)
2. **Transcribe** automatically with AI-powered speech-to-text
3. **Generate** structured study materials:
   - 📝 Summaries (short, medium, long)
   - 📚 Detailed notes (outline, Cornell, mind-map)
   - 🎯 Flashcards (spaced repetition ready)
   - ✅ Quizzes (multiple choice + short answer)
4. **Export** to PDF, Markdown, or HTML
5. **Search** your entire content history

---

## Implementation Approach

We're using the **RPG (Repository Planning Graph) Method** from Microsoft Research, which:
- Separates **WHAT** (functional capabilities) from **HOW** (code structure)
- Defines **explicit dependencies** between modules
- Creates a **topological order** for implementation (foundation → infrastructure → features)
- Enables **dependency-aware task generation** for AI development

See [`docs/PRD.md`](./docs/PRD.md) for the complete specification.

---

## Development Phases

### Phase 0: Foundation ✅ (Planning Complete)
- Core error handling & resilience
- Authentication & authorization setup
- Database configuration

### Phase 1: Infrastructure (Next)
- Storage integration (S3/R2)
- Background task queue (Celery + Redis)
- WebSocket infrastructure

### Phases 2-6: Feature Development
- Data ingestion (YouTube, files, text)
- Transcription pipeline (AssemblyAI, Whisper)
- Content generation (Gemini, Claude, OpenAI)
- Frontend UI (Next.js + React)
- Analytics & monitoring

### Phase 7: Launch Preparation
- Security audit, load testing, deployment

---

## Getting Started

**Note**: Implementation hasn't begun yet. The PRD defines the complete architecture and dependency graph.

To start development:
1. Review the [PRD](./docs/PRD.md)
2. Follow the dependency chain (Phase 0 → Phase 7)
3. Implement modules in topological order

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                │
│  Upload UI → Status Display → Content Viewer        │
└─────────────────────┬───────────────────────────────┘
                      │ REST API + WebSocket
┌─────────────────────▼───────────────────────────────┐
│              Backend (Django + DRF)                  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Apps: ingestion → transcription → generation │  │
│  │ Tasks: Celery background processing          │  │
│  │ Core: Error handling, auth, storage          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
      ┌───────────────┴───────────────┐
      │                               │
┌─────▼─────┐              ┌─────────▼─────────┐
│ AI Providers              │   Storage & DB    │
│ - AssemblyAI │              │ - PostgreSQL      │
│ - Whisper    │              │ - Redis           │
│ - Gemini     │              │ - S3/R2           │
│ - Claude     │              │                   │
└──────────────┘              └───────────────────┘
```

---

## Technology Stack

### Backend
- **Framework**: Django 4.2+ with Django REST Framework
- **Task Queue**: Celery with Redis
- **Database**: PostgreSQL 15+
- **Storage**: AWS S3 / Cloudflare R2
- **WebSockets**: Django Channels

### Frontend
- **Framework**: Next.js 14+ (React 18+)
- **Styling**: Tailwind CSS
- **State**: React Context + TanStack Query

### AI Providers
- **Transcription**: AssemblyAI, OpenAI Whisper
- **LLM**: Google Gemini, Anthropic Claude, OpenAI GPT-4

---

## Success Metrics

- **User Engagement**: 80% complete first session, 70% return within 7 days
- **Quality**: <5% transcription error rate, 85% satisfaction
- **Performance**: <30s processing for <5min files
- **Cost**: <$2.50/user/month

---

## Future Features

- Mobile apps (iOS/Android)
- Browser extension for one-click processing
- Spaced repetition scheduler
- Collaborative study features
- Integration with Notion, Obsidian
- Live lecture transcription

---

## License

[MIT License](./LICENSE)

---

## Contributing

This project is currently in the planning phase. Contributors welcome once Phase 0 implementation begins!
