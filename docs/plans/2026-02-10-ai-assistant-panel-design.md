# AI Assistant Panel — Design Doc

**Date:** 2026-02-10
**Status:** Approved

## Overview

An AI-powered study assistant available on all study set pages. Opens as a side panel on web (slides in from the right) and a bottom sheet on mobile. The assistant has access to the full transcript and all generated content, using Gemini's large context window for retrieval. It supports free-form chat, guided quick actions, and can generate and save new flashcards and quizzes to the study set.

---

## Architecture

### Frontend

- `AssistantPanel` component wraps all study set pages (Notes, Flashcards, Quizzes, StudySetDetail)
- Triggered by a floating "Ask AI" button (bottom-right on web, header button on mobile)
- Web: fixed ~400px right slide-over panel; main content shrinks or overlays
- Mobile: bottom sheet starting at ~50% height, draggable to full-screen
- Conversation history kept in local React state per session (not persisted to DB)
- History capped at last 10 turns before sending to backend

### Backend

- New endpoint: `POST /api/content/<job_id>/assistant`
- Auth: `IsAuthenticated` + `IsOwner` (same pattern as existing content endpoints)
- Stateless: frontend sends full conversation history each request

### Data Flow

1. User sends message or taps quick action
2. Frontend POSTs to `/api/content/<job_id>/assistant` with message + history + optional action
3. Backend fetches transcript + all generated content from Supabase
4. Full context passed to Gemini 2.0 Flash (Option A retrieval)
5. If generation action: run existing generation logic, save to Supabase, return new items
6. Frontend renders response; invalidates content query cache on generation

---

## UI Design

### Trigger
- Web: floating sparkle/chat button, bottom-right corner
- Mobile: button in study set page header

### Panel Layout
```
┌─────────────────────────┐
│  AI Assistant        ✕  │
├─────────────────────────┤
│  [Quiz me] [Explain]    │
│  [+ Flashcards] [+ Quiz]│
├─────────────────────────┤
│                         │
│   conversation thread   │
│                         │
├─────────────────────────┤
│  [___Type a message___] │
└─────────────────────────┘
```

### Quick Action Chips
- **Quiz me** — interactive Q&A in chat from existing flashcards/quiz questions (no DB write)
- **Explain this** — explains the topic of the current study set
- **+ Flashcards** — generates and saves new flashcards
- **+ Quiz** — generates and saves a new quiz

### Message Bubbles
- User: right-aligned, accent color
- Assistant: left-aligned, neutral background, supports markdown
- Generated items: special card with "Saved to study set ✓" badge

### Mobile Bottom Sheet
- Starts at 50% height, draggable to full-screen
- Quick-action chips scroll horizontally
- Handles keyboard push-up natively

---

## API

### Request
```json
POST /api/content/<job_id>/assistant

{
  "message": "Explain the concept of mitosis",
  "conversation_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "action": null
}
```

`action` values: `null` | `"generate_flashcards"` | `"generate_quiz"` | `"quiz_me"`

### Response
```json
{
  "message": "Mitosis is...",
  "action": null,
  "generated_items": null
}
```

For generation actions:
```json
{
  "message": "I generated 10 new flashcards and saved them to your study set.",
  "action": "generated_flashcards",
  "generated_items": [{ "front": "...", "back": "..." }]
}
```

---

## Context Retrieval Strategy

**Option A — Full context (chosen approach):**
Send the full transcript + all generated content in every Gemini request. No chunking or embeddings needed. Gemini 2.0 Flash's 1M token context window handles virtually all study sets.

**Guard:** If total content exceeds ~500K tokens, fall back to keyword-scored chunk selection (top-5 chunks, ~500 tokens each).

**Future upgrade path:** pgvector RAG in Supabase for semantic similarity search if needed at scale.

---

## Content Generation Flow

### Flashcard Generation
1. Backend calls existing Gemini generation logic with full transcript context
2. New flashcards inserted into Supabase under same `job_id` (appended, not replaced)
3. Returned as a preview card in chat with "Saved to study set ✓" badge
4. Frontend invalidates `['content', jobId]` query → Flashcards page updates

### Quiz Generation
- Same flow as flashcards
- If a quiz already exists, append as "Quiz 2", "Quiz 3" (never overwrite existing)

### "Quiz Me" Action
- Pulls from existing flashcards/quiz questions
- Runs interactive Q&A inside the chat thread
- No DB write — session only

---

## What's Out of Scope (for now)
- Persisting conversation history to DB
- Embeddings / vector search
- Assistant awareness of which specific page the user is on
- Streaming responses
