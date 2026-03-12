# Noteably PRD (RPG Method)

<aside>
🧭

**Goal of this template**

Write a PRD that is *dependency-aware* by separating **WHAT** (capabilities) from **HOW** (code structure), then connecting them with explicit dependencies.

</aside>

---

## Repository Planning Graph (RPG) Method

### Core principles

1. **Dual semantics**: Define functional capabilities separately from structural code organization, then map them.
2. **Explicit dependencies**: Never assume. State what depends on what.
3. **Topological order**: Build foundations first, then layers.
4. **Progressive refinement**: Start broad, then iterate toward specificity.

### How to use this template

- Follow the guidance in each section.
- Use the examples to avoid common failure modes.
- Fill in the project-specific sections.
- Keep “what it does” separate from “where it lives” until the Repository Structure section.

### Recommended tools for *creating* PRDs (not parsing)

Use a code-context-aware assistant if you need architecture decisions that fit an existing codebase.

- **Claude Code** (CLI)
- **Cursor** or **Windsurf**
- **Gemini CLI**
- **Codex** or **Grok** (CLI)

> Once the PRD is written, `task-master parse-prd` can use any configured model because it only needs the PRD text.
> 

---

## Problem statement

Start with the problem, not the solution.

Be specific about:

- What pain point exists.
- Who experiences it.
- Why existing solutions do not work.
- What success looks like (measurable outcomes).

### Summary

Students, professionals, and lifelong learners struggle to convert educational content from diverse sources (YouTube videos, lectures, documents) into structured study materials.

Today the workflow is fragmented:

- Transcribe audio or video.
- Extract key information.
- Write summaries and notes.
- Create flashcards.
- Build quizzes.

This often takes hours for content that could be processed in minutes.

### Why current solutions fail

- **Transcription tools** ([Otter.ai](http://Otter.ai), Rev) output raw text, so users still manually create study materials.
- **Note-taking apps** (Notion, Obsidian) lack an end-to-end AI pipeline from multimedia → study materials.
- **Flashcard apps** (Anki, Quizlet) require manual card creation.
- **There is no unified platform** that handles ingestion → transcription → generation → export.

### Core pain point

There is no **“upload and study”** solution that transforms *any input format* (video, audio, document) into ready-to-use study materials (summaries, notes, flashcards, quizzes).

---

## Target users

### Primary persona: College student (Sarah)

- **Workflow**: Lectures, YouTube tutorials, PDFs across multiple courses.
- **Pain**: Spends 3 to 4 hours per day creating study materials from recordings.
- **Goal**: Reduce study prep time by 70% without losing quality.
- **Tech comfort**: High.

### Secondary persona: Professional learner (Marcus)

- **Workflow**: Online courses, webinars, technical docs.
- **Pain**: Hard to retain long-form content without structured review materials.
- **Goal**: Create spaced repetition materials from professional learning.
- **Tech comfort**: Medium to high.

### Tertiary persona: Educator (Dr. Chen)

- **Workflow**: Creates study materials from lecture recordings and course content.
- **Pain**: Slow to produce diverse study formats for different learning styles.
- **Goal**: Generate multiple study formats from a single source quickly.
- **Tech comfort**: Medium.

---

## Success metrics

### User engagement

- 80% of users complete at least one full pipeline (upload → transcription → generation → export) in the first session.
- Average 5+ content items processed per user per month.
- 70% of users return within 7 days.

### Quality

- < 5% transcription error rate (measured against ground truth for a test set).
- 85% user satisfaction rating for generated content quality.
- < 10% content regeneration rate (users satisfied with first output).

### Performance

- < 30 seconds processing time for files under 5 minutes.
- < 2 minutes processing time for files under 30 minutes.
- 99% uptime for transcription and generation services.

### Business

- Average AI cost per user per month: < $2.50.
- Feature usage distribution:
    - 40% summaries
    - 30% notes
    - 20% flashcards
    - 10% quizzes

---

## Capability tree (WHAT the system does)

Think capabilities first. Do not introduce file names or folders here.

### How to define a capability

For each feature, include:

- **Description**: One sentence.
- **Inputs**: What it needs.
- **Outputs**: What it produces.
- **Behavior**: Key logic or transformations.
- Common mistakes (examples)
    
    **Bad**
    
    - Capability: `validation.js`
        - Problem: This is a file, not a capability.
    
    **Bad**
    
    - Capability: Validation
        - Feature: “Make sure data is good”
        - Problem: Too vague. Missing inputs, outputs, and behavior.

### Capability: Source ingestion

Handles accepting and validating content from multiple sources (YouTube URLs, file uploads, text paste).

#### Feature: YouTube URL processing

- **Description**: Extract video metadata and download audio or video content from YouTube URLs.
- **Inputs**: YouTube URL string, user authentication token.
- **Outputs**: Video metadata (title, duration, description, thumbnail), downloaded media file reference.
- **Behavior**: Validate URL, fetch metadata, download media, store reference.

#### Feature: File upload handling

- **Description**: Accept and validate uploaded files (audio, video, PDF, DOCX, TXT) with size and type checks.
- **Inputs**: Multipart file upload, file metadata (name, size, type).
- **Outputs**: File storage reference, validation result, extracted metadata.
- **Behavior**: Whitelist type, enforce size limits, detect MIME type, store, return storage key.

#### Feature: Document text extraction

- **Description**: Extract raw text from document formats (PDF, DOCX, TXT, MD).
- **Inputs**: Multipart file upload or storage URL, file type.
- **Outputs**: Raw text content.
- **Behavior**: Use specialized extractors (pypdf, python-docx), normalize output, skip transcription pipeline.

#### Feature: Text input processing

- **Description**: Accept pasted text and normalize formatting.
- **Inputs**: Raw text string, optional metadata (title, source).
- **Outputs**: Normalized text, character count, detected language.
- **Behavior**: Normalize whitespace and encoding, detect language.

#### Feature: Metadata extraction

- **Description**: Extract structured metadata (titles, headings, timestamps, speaker info when available).
- **Inputs**: Source content (file or URL), content type.
- **Outputs**: Structured metadata object.
- **Behavior**: Parse headers and structure depending on type.

### Capability: Transcription pipeline

Converts audio or video content into text with timestamps and optional speaker separation.

#### Feature: Provider selection

- **Description**: Choose a transcription provider based on content characteristics and preferences.
- **Inputs**: Content type, duration, user preferences, provider availability.
- **Outputs**: Provider identifier, estimated cost, estimated processing time.
- **Behavior**: Evaluate duration and language, check provider status, apply decision rules.

#### Feature: Audio or video transcription

- **Description**: Transcribe media to text with word-level timestamps.
- **Inputs**: Media file reference, language hint, provider selection.
- **Outputs**: Transcription text, timestamps, confidence scores, detected language.
- **Behavior**: Submit job, poll for completion, parse results.

#### Feature: Speaker separation

- **Description**: Label speakers when supported.
- **Inputs**: Transcription result, audio reference.
- **Outputs**: Speaker-labeled segments, speaker count, diarization confidence.
- **Behavior**: Request diarization, reconcile labels across segments.

#### Feature: Transcription error handling

- **Description**: Handle failures, timeouts, and retries with exponential backoff.
- **Inputs**: Provider error response, attempt count, file characteristics.
- **Outputs**: Retry decision, user-facing error, optional provider fallback.
- **Behavior**: Classify error, retry or switch provider, log details.

### Capability: Content generation pipeline

Generates summaries, notes, flashcards, and quizzes from text using LLMs.

#### Feature: LLM provider abstraction

- **Description**: Unified interface for multiple LLM providers.
- **Inputs**: Generation request, provider selection, model parameters.
- **Outputs**: Standardized response format with provider metadata.
- **Behavior**: Normalize request and response, handle provider-specific errors.

#### Feature: Summary generation

- **Description**: Generate short, medium, and long summaries.
- **Inputs**: Source text, target length, optional focus areas.
- **Outputs**: Summary variants, key points, topic tags.
- **Behavior**: Prompt for length, call provider, structure output.

#### Feature: Detailed notes generation

- **Description**: Generate hierarchical notes (outline, Cornell, mind-map-like structure).
- **Inputs**: Source text, note style preference.
- **Outputs**: Structured notes in markdown, concept hierarchy.
- **Behavior**: Identify key concepts, generate headings and bullets.

#### Feature: Flashcard generation

- **Description**: Generate Q/A pairs for spaced repetition.
- **Inputs**: Source text, desired count, difficulty.
- **Outputs**: Flashcards (question, answer, tags, difficulty).
- **Behavior**: Extract concepts, write varied questions, keep answers concise.

#### Feature: Quiz generation

- **Description**: Generate multiple choice and short answer questions.
- **Inputs**: Source text, quiz type, question count.
- **Outputs**: Questions, answer key, explanations.
- **Behavior**: Create distractors, ensure variety and difficulty spread.

#### Feature: Content refinement

- **Description**: Regenerate or refine content based on user instructions.
- **Inputs**: Original output, refinement instructions, content type.
- **Outputs**: Updated content.
- **Behavior**: Preserve context, apply targeted changes.

### Capability: Cloud storage integration

Seamlessly import files from external cloud providers.

#### Feature: Google Drive & Dropbox OAuth

- **Description**: Authenticate with cloud providers and store tokens.
- **Inputs**: OAuth2 callback, user session.
- **Outputs**: Encrypted connection tokens.
- **Behavior**: Exchange codes for tokens, encrypt with Fernet, manage refresh cycle.

#### Feature: Cloud file picker & import

- **Description**: Browse and select files from connected cloud accounts.
- **Inputs**: Provider connection, file ID.
- **Outputs**: Ingested job in Noteably pipeline.
- **Behavior**: Proxy download from provider, upload to Noteably storage, trigger processing.

### Capability: AI Assistant (Noteably AI)

Converse with an AI agent about your study materials and trigger new content generation.

#### Feature: Context-aware chat

- **Description**: Chat with Gemini using the transcript and materials as context.
- **Inputs**: Message, conversation history, job context.
- **Outputs**: AI response.
- **Behavior**: Build system prompt with material snapshots, manage history limits.

#### Feature: Chat-triggered actions

- **Description**: Generate new materials directly from the chat interface.
- **Inputs**: User intent (e.g., "make more flashcards").
- **Outputs**: Newly generated and saved study items.
- **Behavior**: Detect intent, call generation service, merge results into existing records.

### Capability: User interface and interactions

Provides a web experience for upload, progress, and consuming outputs.

#### Feature: Upload and import interface

- **Description**: Drag and drop and file picker ingestion UI.
- **Inputs**: User interactions, file objects.
- **Outputs**: Progress and validation feedback.
- **Behavior**: Client-side validation, preview metadata, upload.

#### Feature: Real-time status updates

- **Description**: Live progress via WebSockets.
- **Inputs**: Backend status events, user session.
- **Outputs**: Status messages, progress percentage, ETA.
- **Behavior**: Maintain connection, handle reconnection, fall back gracefully.

#### Feature: Output viewer

- **Description**: Tabbed interface for Summary, Notes, Flashcards, Quiz.
- **Inputs**: Generated content objects.
- **Outputs**: Rendered views.
- **Behavior**: Render markdown, flashcards, and quizzes appropriately.

#### Feature: Export

- **Description**: Export outputs to PDF, Markdown, or HTML.
- **Inputs**: Content type, selected output, target format.
- **Outputs**: Downloadable file.
- **Behavior**: Format and generate export, trigger download.

#### Feature: Content history management

- **Description**: Save and retrieve prior outputs.
- **Inputs**: User session, query filters.
- **Outputs**: Saved items list and item details.
- **Behavior**: Store metadata, implement search and pagination, allow deletion.

#### Feature: Regeneration interface

- **Description**: UI to refine or regenerate outputs.
- **Inputs**: Refinement instructions, content reference.
- **Outputs**: Updated output and status.
- **Behavior**: Capture instructions, call refinement endpoint, update view.

#### Feature: Quiz attempt tracking

- **Description**: Record and review performance on generated quizzes.
- **Inputs**: Selected answers, score, job ID.
- **Outputs**: Saved attempt record with percentage and history.
- **Behavior**: Store structured performance data, track progress over time.

### Capability: Authentication and authorization

Manages accounts and access control.

#### Feature: User registration

- **Description**: Create accounts with email verification.
- **Inputs**: Email, password, optional name.
- **Outputs**: User object, verification token.
- **Behavior**: Validate, hash, create, email verify, issue JWT.

#### Feature: User login

- **Description**: Authenticate and issue JWT.
- **Inputs**: Email, password.
- **Outputs**: Access token, refresh token, profile.
- **Behavior**: Verify credentials and status, issue tokens.

#### Feature: Token management

- **Description**: Refresh and validate tokens.
- **Inputs**: Refresh token, access token.
- **Outputs**: New access token and validity.
- **Behavior**: Validate, rotate, revoke on logout.

#### Feature: Access control

- **Description**: Enforce resource permissions.
- **Inputs**: User identity, resource, action.
- **Outputs**: Allow or deny.
- **Behavior**: Ownership checks, permission policies, rate limits, logging.

### Capability: Advanced account management

Secure and manage user identities and access.

#### Feature: Account deletion with grace period

- **Description**: Soft-delete accounts with a 14-day recovery window.
- **Inputs**: Deletion request, verification.
- **Outputs**: Scheduled deletion, email notification.
- **Behavior**: Mark for deletion, lock access, allow recovery via email OTP.

#### Feature: Multi-step email/password security

- **Description**: Securely change sensitive account details using OTPs.
- **Inputs**: OTP, new email/password.
- **Outputs**: Updated credentials.
- **Behavior**: Current email validation, new email confirmation, security logging.

#### Feature: API key management

- **Description**: Issue and revoke keys for programmatic access.
- **Inputs**: Key label, user session.
- **Outputs**: Scoped API key.
- **Behavior**: Generate secure tokens, list active keys, allow immediate revocation.

### Capability: Storage and file management

Stores files and tracks references.

#### Feature: Object storage integration

- **Description**: Store and retrieve files via S3-compatible storage.
- **Inputs**: File data, storage key, operation.
- **Outputs**: Storage URL, success state.
- **Behavior**: Upload with headers, generate keys, retry on transient errors.

#### Feature: File reference management

- **Description**: Track file metadata and references.
- **Inputs**: Upload result, user ID, metadata.
- **Outputs**: File record.
- **Behavior**: Create DB record, link to user, manage lifecycle.

#### Feature: File cleanup

- **Description**: Remove orphaned or expired files.
- **Inputs**: Expiration rules.
- **Outputs**: Cleanup report.
- **Behavior**: Identify orphans, delete, reconcile records.

### Capability: Background processing

Runs async transcription and generation.

#### Feature: Task queue management

- **Description**: Queue and manage background work.
- **Inputs**: Task type, parameters, priority.
- **Outputs**: Task ID, queue position, ETA.
- **Behavior**: Enqueue, prioritize, return IDs.

#### Feature: Task status tracking

- **Description**: Track and report status.
- **Inputs**: Task updates.
- **Outputs**: Status, progress percent, error messages.
- **Behavior**: Persist state, emit WebSocket events.

### Capability: Analytics and metrics

Tracks usage and costs.

#### Feature: Usage tracking

- **Description**: Record user actions and feature usage.
- **Inputs**: User ID, action type, metadata, timestamp.
- **Outputs**: Event record.
- **Behavior**: Log, anonymize, batch.

#### Feature: Performance metrics collection

- **Description**: Collect timings and error rates.
- **Inputs**: Operation type, duration, outcome.
- **Outputs**: Metric record.
- **Behavior**: Measure, aggregate, report.

#### Feature: Cost tracking

- **Description**: Attribute AI provider costs.
- **Inputs**: Provider, operation, tokens, cost.
- **Outputs**: Cost record.
- **Behavior**: Compute and aggregate.

---

## Repository structure (HOW it is organized)

Now map capabilities to modules. Keep module boundaries clear and singular.

```
noteably/
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── ingestion/
│   │   ├── transcription/
│   │   ├── generation/
│   │   ├── accounts/
│   │   ├── storage/
│   │   ├── tasks/
│   │   ├── analytics/
│   │   └── core/
│   ├── manage.py
├── frontend/
│   ├── src/
│   │   ├── app/ (Next.js App Router)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/ (api clients, supabase)
│   │   └── router/
│   └── package.json
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
```

---

## Module definitions

### Module: ingestion

- **Maps to capability**: Source ingestion
- **Responsibility**: Ingest content from YouTube, files, and text

```
ingestion/
├── models.py
├── serializers.py
├── views.py
├── youtube_handler.py
├── file_handler.py
├── text_handler.py
└── metadata_extractor.py
```

**Exports**

- `process_youtube_url(url)`
- `handle_file_upload(file)`
- `process_text_input(text)`
- `extract_metadata(source)`

### Module: transcription

- **Maps to capability**: Transcription pipeline
- **Responsibility**: Convert media to text with timestamps and diarization

```
transcription/
├── models.py
├── serializers.py
├── views.py
├── provider_selector.py
├── whisper_client.py
├── assemblyai_client.py
├── speaker_separation.py
├── language_detector.py
└── error_handler.py
```

**Exports**

- `select_provider(content_type, duration)`
- `transcribe_audio(file_ref, provider)`
- `detect_speakers(transcription)`
- `detect_language(content)`
- `handle_transcription_error(error, context)`

### Module: generation

- **Maps to capability**: Content generation pipeline
- **Responsibility**: Generate study materials via LLM providers

```
generation/
├── models.py
├── serializers.py
├── views.py
├── llm_provider.py
├── gemini_client.py
├── anthropic_client.py
├── openai_client.py
├── assemblyai_lemur_client.py
├── summary_generator.py
├── notes_generator.py
├── flashcard_generator.py
├── quiz_generator.py
└── refinement_handler.py
```

**Exports**

- `LLMProvider`
- `generate_summary(text, length)`
- `generate_notes(text, style)`
- `generate_flashcards(text, count)`
- `generate_quiz(text, type, count)`
- `refine_content(content, instructions)`

### Module: accounts

- **Maps to capability**: Authentication and authorization
- **Responsibility**: Registration, login, tokens, permissions

```
accounts/
├── models.py
├── serializers.py
├── views.py
├── registration.py
├── login.py
├── token_manager.py
└── permissions.py
```

**Exports**

- `register_user(email, password)`
- `login_user(email, password)`
- `refresh_token(refresh_token)`
- `check_permission(user, resource, action)`

### Module: storage

- **Maps to capability**: Storage and file management
- **Responsibility**: Object storage, file references, cleanup

```
storage/
├── models.py
├── object_storage.py
├── file_manager.py
└── cleanup.py
```

**Exports**

- `upload_file(file_data, key)`
- `download_file(storage_key)`
- `delete_file(storage_key)`
- `create_file_reference(file_data, user_id)`
- `cleanup_orphaned_files()`

### Module: tasks

- **Maps to capability**: Background processing
- **Responsibility**: Async transcription and generation orchestration

```
tasks/
├── celery_app.py
├── transcription_tasks.py
├── generation_tasks.py
└── status_tracker.py
```

**Exports**

- `queue_transcription_task(file_ref, params)`
- `queue_generation_task(source_text, type, params)`
- `get_task_status(task_id)`
- `cancel_task(task_id)`

### Module: analytics

- **Maps to capability**: Analytics and metrics
- **Responsibility**: Usage, performance, and cost analytics

```
analytics/
├── models.py
├── usage_tracker.py
├── performance_collector.py
├── cost_tracker.py
└── dashboard.py
```

**Exports**

- `track_event(user_id, action, metadata)`
- `record_performance(operation, duration, success)`
- `track_cost(provider, operation, cost)`
- `get_analytics(time_range, filters)`

### Module: core

- **Maps to capability**: Error handling and resilience
- **Responsibility**: Shared exceptions, retries, fallback patterns

```
core/
├── exceptions.py
├── error_handler.py
├── retry_logic.py
└── fallback.py
```

**Exports**

- `classify_error(error, context)`
- `retry_with_backoff(func, max_attempts)`
- `get_fallback_provider(provider, operation)`
- `log_error(error, context)`

---

## Dependency chain (the critical section)

Define explicit dependencies between modules. List foundation first.

### Foundation layer (Phase 0)

- **core**: no dependencies
- **accounts**: no dependencies

### Infrastructure layer (Phase 1)

- **storage** depends on: `core`, `accounts`

### Data ingestion layer (Phase 2)

- **ingestion** depends on: `storage`, `core`, `accounts`

### Processing layer (Phase 3)

- **transcription** depends on: `ingestion`, `storage`, `core`
- **generation** depends on: `transcription`, `core`

### Orchestration layer (Phase 4)

- **tasks** depends on: `transcription`, `generation`, `core`

### Analytics layer (Phase 5)

- **analytics** depends on: `accounts`, `ingestion`, `transcription`, `generation`, `tasks`, `core`
- Anti-patterns to avoid
    - Circular dependencies (for example, API depends on validation and validation depends on API).
    - “Depends on everything” modules.
    - Vague layers that do not reflect build order.

---

## Development phases

Turn the dependency chain into phased delivery with entry and exit criteria.

### Phase 0: Foundation and authentication

**Goal**: Establish error handling infrastructure and authentication.

**Entry criteria**

- Django project initialized.
- Database configured.
- Python environment set up.

**Tasks**

- [ ]  Implement core error handling module.
- [ ]  Implement retry logic with exponential backoff.
- [ ]  Implement fallback mechanism framework.
- [ ]  Set up Django user model and authentication.
- [ ]  Implement JWT token management.

**Exit criteria**

- Other modules import core utilities without errors.
- Users can register, log in, and receive JWTs.

### Phase 1: Storage infrastructure

**Goal**: Support file upload and storage.

**Entry criteria**

- Phase 0 complete.

**Tasks**

- [ ]  Set up object storage client (R2 or S3).
- [ ]  Implement file reference models.
- [ ]  Implement file upload API endpoint.
- [ ]  Implement file cleanup service.

**Exit criteria**

- Files upload, store, and retrieve correctly.
- References persist in DB.

### Phase 2: Source ingestion

**Goal**: Ingest YouTube, file, and text sources.

**Entry criteria**

- Phase 1 complete.

**Tasks**

- [ ]  Implement YouTube URL handler.
- [ ]  Implement file handler.
- [ ]  Implement text processor.
- [ ]  Implement metadata extractor.
- [ ]  Create ingestion API endpoints.

**Exit criteria**

- All source types validate, store, and return references.

### Phase 3: Transcription pipeline

**Goal**: Produce timestamped transcripts.

**Entry criteria**

- Phase 2 complete.

**Tasks**

- [ ]  Implement provider selector.
- [ ]  Implement Whisper client.
- [ ]  Implement AssemblyAI client.
- [ ]  Implement language detection.
- [ ]  Implement transcription error handling.
- [ ]  Create transcription API endpoints.

**Exit criteria**

- Media transcribes with timestamps.
- Retries and fallback work.

### Phase 4: Content generation pipeline

**Goal**: Generate summaries, notes, flashcards, and quizzes.

**Entry criteria**

- Phase 3 complete.

**Tasks**

- [ ]  Implement LLM provider abstraction.
- [ ]  Implement provider clients.
- [ ]  Implement generators (summary, notes, flashcards, quiz).
- [ ]  Implement refinement handler.
- [ ]  Create generation API endpoints.

**Exit criteria**

- All outputs generate from text reliably.
- Provider fallback works.

### Phase 5: Background processing

**Goal**: Run transcription and generation asynchronously.

**Entry criteria**

- Phase 4 complete.

**Tasks**

- [ ]  Set up Celery with Redis or RabbitMQ.
- [ ]  Implement transcription task.
- [ ]  Implement generation task.
- [ ]  Implement task status tracking.
- [ ]  Implement WebSocket support.

**Exit criteria**

- Long-running operations do not block the API.
- Status updates work.

### Phase 6: User interface

**Goal**: End-to-end UI for upload → outputs → export.

**Entry criteria**

- Phase 5 complete.

**Tasks**

- [ ]  Upload and import UI.
- [ ]  Real-time status display.
- [ ]  Output viewer.
- [ ]  Export tools.
- [ ]  Content history.
- [ ]  Regeneration interface.
- [ ]  Auth pages.
- [ ]  Main dashboard.

**Exit criteria**

- Users can complete the full workflow via UI.

### Phase 7: Analytics and monitoring

**Goal**: Measure usage, performance, and costs.

**Entry criteria**

- Phase 6 complete.

**Tasks**

- [ ]  Usage tracking.
- [ ]  Performance metrics.
- [ ]  Cost tracking.
- [ ]  Analytics dashboard API and UI.

**Exit criteria**

- Administrators can monitor trends and costs.

---

## Testing strategy

### Test pyramid

```
      /\
     /E2E\        ← 10% (critical user workflows)
    /------\
   /Integration\ ← 30% (module interactions, APIs, external services)
  /------------\
 /  Unit Tests  \ ← 60% (fast, deterministic business logic)
/----------------\
```

### Coverage requirements

- Line coverage: 80% minimum.
- Branch coverage: 75% minimum.
- Function coverage: 85% minimum.
- Statement coverage: 80% minimum.

### Test generation guidelines

- **Unit tests**: Focus on business logic and transformations. Mock external APIs and DB.
- **Integration tests**: Validate module interactions and endpoints using a test DB and mocked third parties.
- **E2E tests**: Cover the full workflow (upload → transcribe → generate → export) with mocked providers.

---

## Technical architecture

### System components

**Backend**

- Django REST Framework
- Celery (Redis)
- Supabase PostgreSQL
- Supabase Storage (S3 compatible)
- Django Channels for WebSockets

**Frontend**

- Next.js (App Router)
- Tailwind CSS
- TanStack Query
- PDF.js

**External services**

- YouTube Data API
- OpenAI Whisper API
- AssemblyAI
- Google Gemini (2.0 Flash)
- Supabase Auth
- Resend (Transactional Email)

### Data models (sketch)

#### User

```python
User:
  - id (UUID, primary key)
  - email (string, unique, indexed)
  - password_hash (string)
  - name (string, optional)
  - created_at (datetime)
  - email_verified (boolean)
  - is_active (boolean)
```

#### Source

```python
Source:
  - id (UUID, primary key)
  - user (ForeignKey to User)
  - source_type (enum: youtube, file, text)
  - source_reference (string)
  - metadata (JSONField)
  - created_at (datetime)
  - status (enum: pending, processing, completed, failed)
```

#### File

```python
File:
  - id (UUID, primary key)
  - user (ForeignKey to User)
  - storage_key (string, indexed)
  - original_filename (string)
  - file_type (enum: audio, video, document)
  - mime_type (string)
  - size_bytes (integer)
  - uploaded_at (datetime)
  - expires_at (datetime, optional)
```

#### Transcription

```python
Transcription:
  - id (UUID, primary key)
  - source (ForeignKey to Source)
  - provider (enum: whisper, assemblyai)
  - text (text)
  - timestamps (JSONField)
  - speakers (JSONField, optional)
  - language (string)
  - confidence_scores (JSONField, optional)
  - created_at (datetime)
  - processing_time_seconds (float)
```

#### GeneratedContent

```python
GeneratedContent:
  - id (UUID, primary key)
  - source (ForeignKey to Source)
  - transcription (ForeignKey to Transcription, optional)
  - content_type (enum: summary, notes, flashcards, quiz)
  - provider (enum: gemini, anthropic, openai, assemblyai_lemur)
  - content (JSONField)
  - metadata (JSONField)
  - created_at (datetime)
  - processing_time_seconds (float)
  - cost_usd (decimal, optional)
```

#### Task

```python
Task:
  - id (UUID, primary key)
  - user (ForeignKey to User)
  - task_type (enum: transcription, generation)
  - status (enum: pending, running, completed, failed, cancelled)
  - source (ForeignKey to Source)
  - parameters (JSONField)
  - result (JSONField, optional)
  - error_message (text, optional)
  - progress_percentage (integer)
  - created_at (datetime)
  - started_at (datetime, optional)
  - completed_at (datetime, optional)
```

---

## Risks and mitigations

### Technical risks

- **LLM provider reliability and rate limits**
    - Mitigation: Multi-provider fallback, retries with backoff, caching where appropriate.
- **Transcription quality for low-quality audio**
    - Mitigation: Audio validation, best-provider selection, allow corrections.
- **Long file processing times**
    - Mitigation: Chunking, accurate progress, real-time updates.
- **Cost overruns**
    - Mitigation: Cost tracking, usage limits, prompt optimization.
- **WebSocket stability**
    - Mitigation: Reconnect logic and polling fallback.

### Dependency risks

- **External API changes**
    - Mitigation: Pin versions, monitor changelogs, integration tests.
- **YouTube quota limits**
    - Mitigation: Cache metadata, quota monitoring, alternative extraction.
- **Storage provider outages**
    - Mitigation: Retries, monitoring, temporary fallback storage.

### Scope risks

- **Feature creep**
    - Mitigation: Strict v1 scope, defer v2 ideas.
- **Underestimating content quality needs**
    - Mitigation: Early user testing, iteration, refinement tools.
- **Mobile responsiveness complexity**
    - Mitigation: Mobile-first design, real device testing.
- **Integration testing complexity**
    - Mitigation: Strong mocking strategy, staged rollout, feature flags.

---

## References

- Django REST Framework: [https://www.django-rest-framework.org/](https://www.django-rest-framework.org/)
- Celery: [https://docs.celeryproject.org/](https://docs.celeryproject.org/)
- OpenAI Whisper: [https://platform.openai.com/docs/guides/speech-to-text](https://platform.openai.com/docs/guides/speech-to-text)
- AssemblyAI: [https://www.assemblyai.com/docs](https://www.assemblyai.com/docs)
- Gemini: [https://ai.google.dev/docs](https://ai.google.dev/docs)
- Anthropic: [https://docs.anthropic.com/](https://docs.anthropic.com/)
- Django Channels: https://channels.readthedocs.io/
- Repository Planning Graph Method: Microsoft Research

---

## Glossary

- **Transcription**: Converting audio or video to text.
- **Speaker diarization**: Identifying and labeling speakers.
- **LLM**: Large Language Model.
- **LeMUR**: AssemblyAI long-form content understanding.
- **JWT**: JSON Web Token.
- **WebSocket**: Bidirectional real-time protocol.
- **Celery**: Distributed task queue.
- **R2**: Cloudflare R2 object storage.
- **DRF**: Django REST Framework.
- **TDD**: Test-driven development.
- **RPG**: Repository Planning Graph.

---

## Open questions

1. **Cost model**: Usage-based pricing or subscription tiers?
2. **File size limits**: What max file sizes are supported?
3. **Content retention**: How long should generated content be stored?
4. **Provider selection logic**: Which criteria drive selection?
5. **Mobile**: Web-only for v1 or include mobile apps?
6. **Export formats**: Anything beyond PDF, Markdown, and HTML?
7. **Rate limiting**: Limits per user?
8. **Partial failures**: How to handle transcription success but generation failure?