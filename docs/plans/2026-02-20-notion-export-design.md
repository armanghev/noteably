# Notion Export Integration — Design

**Date:** 2026-02-20
**Status:** Approved

## Overview

Add "Export to Notion" functionality that pushes Noteably study materials directly into a user's Notion workspace via OAuth + the Notion REST API. Content is smart-mapped: summary/notes become rich-text pages, flashcards and quizzes become inline databases.

## Architecture

Three main pieces:

1. **Notion OAuth & Connection Management** — new `integrations` Django app handles the OAuth handshake, stores tokens per user.
2. **Backend Export Engine** — new `notion_exporter.py` in the `export` app calls the Notion API to create pages and databases.
3. **Frontend Modal** — a `NotionExportModal` component on StudySetDetail lets users select material types and trigger the export.

## Data Model

New model `NotionConnection` (one-to-one with user):

| Field | Type | Notes |
|---|---|---|
| `user_id` | FK | One-to-one |
| `access_token` | string | Store encrypted |
| `workspace_id` | string | |
| `workspace_name` | string | |
| `workspace_icon` | string | Optional, for display |
| `default_page_id` | string | Null = workspace root |
| `connected_at` | datetime | |

## API Endpoints

All under `/api/integrations/notion/`:

```
GET    /auth/             → Redirect to Notion OAuth URL
GET    /callback/         → Handle OAuth callback, store token, redirect to frontend
GET    /status/           → { connected, workspace_name, workspace_icon, default_page }
DELETE /disconnect/       → Revoke & delete connection
GET    /pages/            → List user's top-level Notion pages (for destination picker)
PUT    /settings/         → Update default_page_id
POST   /export/<job_id>/  → { material_types: [...] } → { notion_url }
```

## Smart Mapping

All content lands under a single parent page named `"{filename} — Study Materials"` created at the user's configured destination (default: workspace root).

| Material | Notion Object | Structure |
|---|---|---|
| Summary | Child page | H1 title, paragraph body, bulleted key points |
| Notes | Child page | Parsed into heading/paragraph blocks |
| Flashcards | Inline database | Columns: Front, Back, Tags (multi-select) |
| Quiz | Inline database | Columns: Question, Option A–D, Correct Answer, Explanation |

## Frontend

**New files:**
- `frontend/src/components/NotionExportModal.tsx`
- `frontend/src/lib/api/services/integrations.ts`

**Modified files:**
- `frontend/src/pages/StudySetDetail.tsx` — add "Export to Notion" button
- `frontend/src/pages/Profile.tsx` — add "Connected Apps" section

**Modal states:**
- **Not connected** — shows "Connect Notion" button; OAuth opens in a popup; on completion popup closes and modal refreshes.
- **Connected** — shows workspace name/icon, destination label, material type checkboxes (all checked by default), "Export" button. On success shows "View in Notion →" link.

**Profile "Connected Apps" section:**
- Shows Notion workspace name + icon when connected, with "Disconnect" option.
- Optional "Change destination" link opens a page picker populated from `/pages/`.

## Backend

**New app:** `backend/apps/integrations/`
- `models.py` — `NotionConnection` model
- `views.py` — OAuth redirect, callback, status, disconnect, pages, settings
- `urls.py`

**New file:** `backend/apps/export/notion_exporter.py`
- `export_to_notion(job, access_token, parent_page_id, material_types)` — orchestrates all Notion API calls.
- Uses the official `notion-client` Python SDK.

## OAuth Flow

1. User clicks "Connect Notion" → `GET /api/integrations/notion/auth/` → 302 to Notion consent screen.
2. User approves → Notion redirects to `GET /api/integrations/notion/callback/?code=...`.
3. Backend exchanges code for access token, saves `NotionConnection`, redirects to frontend with `?notion=connected`.
4. Frontend detects query param, refreshes connection status, shows connected state.

## Environment Variables

```
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_REDIRECT_URI   # e.g. https://api.noteably.app/api/integrations/notion/callback/
```

## Dependencies

```
# Backend
notion-client          # Official Notion Python SDK
```

## Out of Scope

- Obsidian export
- Anki export
- Two-way sync (Noteably → Notion is one-way push only)
- Updating existing Notion pages (always creates new)
