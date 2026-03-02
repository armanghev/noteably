# Cloud Storage Import (Google Drive, OneDrive, Dropbox) – Design

**Date:** 2025-02-22

## Overview

Users can connect Google Drive, OneDrive, and Dropbox once (in Settings or from the Upload page on first use), then import files via each provider’s file picker. The backend downloads the selected file and processes it through the existing upload pipeline (R2, Job, Celery).

## 1. Data Model and Where "Connect" Lives

### Data Model

Add a `cloud_connections` table (Supabase) with:

- `user` (uuid, FK to auth.users)
- `provider` (enum: `google_drive`, `onedrive`, `dropbox`)
- `access_token` (encrypted text)
- `refresh_token` (encrypted text, nullable for some providers)
- `expires_at` (timestamptz)
- `created_at`, `updated_at`

Unique constraint on `(user, provider)` so each user has at most one connection per provider.

### Where Users Connect

1. **Profile → Settings tab** – Add a "Cloud storage" block with three cards (Google Drive, OneDrive, Dropbox). Each shows "Connect" or "Connected" with disconnect. Clicking "Connect" initiates OAuth.

2. **Upload page** – Add "Import from cloud" option (buttons or dropdown). If user clicks one and isn’t connected, show modal: "Connect to [Provider] to import files" with Connect button that starts OAuth. After connecting, redirect back to Upload and open the picker.

### OAuth Flow

- `GET /api/cloud/connect/<provider>/` – Redirects to provider OAuth URL with `state` (user + next URL).
- Provider callback hits our backend; we exchange code for tokens, upsert `cloud_connections`, redirect to `next` (e.g. `/upload` or `/profile`).

### API

- `GET /api/cloud/connections/` – Returns `[{ provider, connected: true }]` for current user (no tokens).
- `DELETE /api/cloud/connections/<provider>/` – Revokes and deletes the connection.

---

## 2. Import Flow and Backend Pipeline

### Frontend: Opening the Picker

Each provider exposes a JS SDK (Google Picker, Microsoft Graph file picker, Dropbox Chooser). Frontend needs an access token to open it. Add:

- `GET /api/cloud/picker-token/<provider>/` – Returns short-lived `access_token` (or refreshed token) for that provider. Used only to initialize the picker in the browser.

Flow: User clicks "Import from Google Drive" → frontend fetches picker token → loads Google Picker with that token → user selects file → picker returns file id → frontend calls our import endpoint with `provider` and `file_id`.

### Backend: Import Endpoint

- `POST /api/cloud/import/`  
  Body: `{ provider, file_id, material_types, options }`  
  (Provider-specific: Google uses `file_id`; OneDrive uses `driveItem` id; Dropbox uses path or id.)

Backend:

1. Loads user’s `cloud_connections` row for that provider.
2. Refreshes token if expired.
3. Downloads file via provider API (Drive API, Microsoft Graph, Dropbox API).
4. Validates file type and size (same rules as direct upload).
5. Checks quota.
6. Creates Job with `status="uploading"`.
7. Uploads downloaded bytes to R2 (same path as direct upload).
8. Updates Job to `status="queued"` and triggers existing Celery orchestration task.

### Reuse of Existing Logic

Reuse `validate_file_type`, `validate_file_size`, `get_file_duration`, `check_user_quota`, `upload_to_r2`, and `orchestrate_job_task`. New piece: `download_from_provider(provider, file_id, tokens)` helper that returns file bytes + metadata (filename, content_type).

### File Type Mapping

Provider APIs return MIME types. Map to our allowed set (e.g. `application/pdf` → PDF, `audio/mpeg` → MP3) and reject unsupported types with a clear error.

---

## 3. Error Handling, Provider Quirks, and Testing

### Error Handling

- **Token expired / refresh failed** – Return 401; frontend shows "Reconnect to [Provider]" and re-initiates OAuth.
- **File not found** (deleted, moved, or no access) – 404 with clear message.
- **Unsupported file type** – 400, same messaging as direct upload.
- **Quota exceeded** – Same as direct upload.
- **Provider API rate limit / 5xx** – Use `@retry_with_backoff`, then surface generic "Cloud service temporarily unavailable."

### Provider Quirks

- **Google Drive** – Picker returns document IDs. Use Drive API `files.get` with `alt=media` to download. For Google Docs/Sheets, skip (not in our supported types) or return clear "This file type isn't supported."
- **OneDrive** – Picker returns `driveItem` id. Use Microsoft Graph `GET /me/drive/items/{id}/content` to download.
- **Dropbox** – Chooser can return temporary link or file metadata. Prefer Dropbox API `files/download` with path/id for reliable downloads; fall back to temporary link if needed.

### Security

- Encrypt `access_token` and `refresh_token` at rest (Django `FERNET` or Supabase Vault). Use env var for encryption key.
- Validate `state` in OAuth callbacks to prevent CSRF.
- Ensure `picker-token` and `import` endpoints require `IsAuthenticated` and that the connection belongs to the requesting user.

### Testing

- Unit tests for `download_from_provider` with mocked provider responses.
- Integration tests with provider sandbox/test apps where available.
- Manual E2E: connect each provider, pick a file, confirm Job completes and study materials generate.

---

## 4. UI/UX and Implementation Order

### Upload Page

Add "Import from cloud" area alongside the drag-and-drop zone (e.g. "Or import from" with three provider buttons). If not connected, clicking opens modal to connect. If connected, clicking opens the provider’s picker. After selection, same UX as direct upload: processing screen, progress, redirect to study set when done.

### Profile → Settings

Add "Cloud storage" section with three cards (Google Drive, OneDrive, Dropbox). Each shows provider icon, name, and either "Connect" or "Connected" with "Disconnect" action. Same OAuth flow; after connecting from Settings, redirect back to Profile.

### Implementation Order

1. DB: `cloud_connections` table and migrations.
2. Backend: OAuth connect/callback, token storage/refresh, picker-token and import endpoints, provider download helpers.
3. Frontend: Cloud connections API client, Profile "Cloud storage" section, Upload "Import from cloud" + modals + picker integration per provider.
4. Tests and manual E2E.

---

## Summary

Connect once (Settings or Upload), store tokens server-side, use provider pickers, download server-side, reuse existing upload pipeline.
