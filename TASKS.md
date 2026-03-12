# Noteably - Development Task List

This document outlines all tasks needed to build the MVP of Noteably, an AI-powered study materials generation platform that transforms audio/video content into summaries, notes, flashcards, and quizzes.

**Last Updated:** 2026-03-11
**Status:** In Progress - Core MVP features implemented and optimized. Migrated frontend from Vite to Next.js App Router. Real-time generation flow refactored for performance. Media players fully synchronized with transcripts. Export functionality complete. Cloud storage integration (Google Drive + Dropbox) implemented. AI assistant with chat and quick actions built. Extensive account security features (deletion/recovery, email change, password management, security actions, API keys) completed. Document file support (PDF, DOCX, TXT, MD) added.

---

## Phase 1: Foundation & Infrastructure

### 1.1 Project Setup & Core Utilities

- [x] 1. **Set up Django project structure**
  - [x] Initialize Django project with proper directory structure
  - [x] Configure settings for development, staging, production
  - [x] Set up environment variable management
  - [x] Configure Django REST Framework
  - [x] Set up CORS configuration
  - [x] Implement email notifications (Resend.com) for uploads & completion

- [x] 2. **Implement core error handling and resilience patterns**
  - [x] Create custom exception classes in `core/exceptions.py`
  - [x] Implement error classification utility
  - [x] Build exponential backoff retry logic
  - [x] Set up centralized error logging

- [x] 3. **Configure Supabase database integration**
  - [x] Set up Supabase project and obtain credentials
  - [x] Configure Django to use Supabase PostgreSQL
  - [x] Create Supabase client wrapper utility
  - [ ] Set up Row Level Security (RLS) policies
  - [x] Test database connection and migrations

- [x] 4. **Set up Redis and Celery for background tasks**
  - [x] Configure Redis connection
  - [x] Set up Celery application
  - [x] Configure task queues (transcription, generation)
  - [x] Implement task status tracking utilities

- [x] 5. **Set up WebSocket infrastructure with Django Channels**
  - [x] Configure Django Channels with Redis
  - [x] Create WebSocket consumers for job status updates
  - [x] Implement WebSocket middleware for authentication
  - [x] Handle connection/disconnection/reconnection logic
  - [x] Implement WebSocket event emitter utility
  - [x] Test real-time message delivery
  - **Note:** Infrastructure is set up and used for real-time job updates (Upload page)

### 1.2 Authentication & Authorization

- [x] 6. **Implement user registration with Supabase Auth**
  - [x] Create registration endpoint delegating to Supabase
  - [x] Implement email validation (handled by Supabase)
  - [x] Handle verification token flow (handled by Supabase)
  - [x] Create user profile on successful registration
  - [x] Set up default subscription tier (free)
  - [x] Create registration page UI

- [x] 7. **Implement user login and JWT token management**
  - [x] Create login endpoint with Supabase Auth
  - [x] Implement JWT access token generation
  - [x] Set up refresh token handling
  - [x] Create token validation middleware
  - [x] Implement logout with token revocation (handled by Supabase)

- [x] 8. **Implement access control and permissions**
  - [x] Create permission classes for DRF
  - [x] Implement resource ownership validation
  - [x] Set up rate limiting per user
  - [x] Configure endpoint-specific rate limits
  - [x] Test authorization on protected endpoints

### 1.3 Storage Infrastructure

- [x] 9. **Implement Cloudflare R2 storage integration**
  - [x] Configure R2 credentials and bucket
  - [x] Create R2 client wrapper with upload/download/delete
  - [x] Implement signed URL generation for secure access
  - [x] Set up proper content type headers
  - [x] Test file upload and retrieval
  - **Note:** Migrated to Supabase Storage for unified infrastructure

- [x] 10. **Implement file reference management**
  - [x] Create file reference database models
  - [x] Link files to users with proper foreign keys
  - [x] Track file metadata (size, type, duration)
  - [x] Implement file lifecycle tracking
  - [x] Create file reference serializers
  - [x] Migrate to Supabase Storage with signed URL support

---

## Phase 2: Data Ingestion Pipeline

### 2.1 File Upload System

- [x] 11. **Implement file upload handling with validation**
  - [x] Create POST /api/process endpoint
  - [x] Validate file types against whitelist (mp3, wav, m4a, mp4, webm, mov)
  - [x] Enforce file size limits (100MB free, 500MB paid)
  - [x] Extract MIME type and basic metadata
  - [x] Extract MIME type and basic metadata
  - [x] Return job_id for status tracking
  - [x] **Optimization:** Optimistic UI implemented for immediate "processing" state

- [x] 12. **Implement material type selection handling**
  - [x] Accept material_types array in upload request
  - [x] Validate material type values (summary, notes, flashcards, quiz)
  - [x] Store material selection preferences in job record
  - [x] Accept optional customization options (length, count, difficulty)
  - [x] Create job serializers for request/response

- [x] 13. **Implement metadata extraction from uploaded files**
  - [x] Extract media file duration using ffprobe or similar
  - [x] Detect audio/video format and codec
  - [x] Extract basic file properties (bitrate, channels)
  - [x] Store extracted metadata in database
  - [x] Handle metadata extraction errors gracefully

- [x] 14. **Create Jobs database model and tracking**
  - [x] Create jobs table with all required fields
  - [x] Implement job status state machine (queued→transcribing→generating→completed)
  - [x] Track progress percentage (0-100)
  - [x] Store current processing step description
  - [x] Create job serializers for API responses

---

## Phase 3: Transcription Pipeline

### 3.1 AssemblyAI Integration

- [x] 15. **Implement AssemblyAI client integration**
  - [x] Set up AssemblyAI API credentials
  - [x] Create AssemblyAI client wrapper class
  - [x] Implement file upload to AssemblyAI
  - [x] Start transcription job with configuration
  - [x] Handle API responses and errors

- [x] 16. **Implement speaker diarization**
  - [x] Enable speaker_labels in AssemblyAI configuration
  - [x] Parse speaker-labeled segments from response
  - [x] Assign consistent speaker labels (Speaker A, B, etc.)
  - [x] Store speaker data in structured format
  - [x] Handle cases with single speaker

- [x] 17. **Implement language detection**
  - [x] Configure automatic language detection
  - [x] Parse detected language code from response
  - [x] Store language code in transcription record
  - [x] Support 99+ languages
  - [x] Handle detection confidence scores

- [x] 18. **Implement transcription error handling**
  - [x] Classify error types (timeout, rate limit, invalid file)
  - [x] Implement retry with exponential backoff (max 3 attempts)
  - [ ] Emit error status via WebSocket
  - [x] Log detailed error information
  - [x] Provide user-friendly error messages

- [x] 19. **Create Transcriptions database model**
  - [x] Create transcriptions table with all fields
  - [x] Store full text and word-level timestamps
  - [x] Store speaker segments in JSONB
  - [x] Link to job record
  - [x] Create transcription serializers

---

## Phase 4: Content Generation Pipeline

### 4.1 Gemini Integration

- [x] 20. **Implement Google Gemini client integration**
  - [x] Set up Gemini API credentials
  - [x] Create Gemini client wrapper class
  - [x] Implement text generation with configurable model
  - [x] Handle API responses and errors
  - [x] Implement rate limit handling

- [x] 21. **Implement material-specific prompt templates**
  - [x] Create summary prompt template (short/medium/long variants)
  - [x] Create notes prompt template (hierarchical markdown structure)
  - [x] Create flashcards prompt template (Q/A JSON format)
  - [x] Create quiz prompt template (MCQ with distractors)
  - [x] Store templates in prompts.py

### 4.2 Material Generators

- [x] 22. **Implement summary generation**
  - [x] Build summary prompt with length specification
  - [x] Call Gemini API with summary prompt
  - [x] Parse response for title, main points, subtopics
  - [x] Generate all three length variants
  - [x] Extract topic tags

- [x] 23. **Implement detailed notes generation**
  - [x] Build notes prompt for markdown structure
  - [x] Call Gemini API with notes prompt
  - [x] Parse markdown response
  - [x] Ensure proper heading structure (H2, H3)
  - [x] Extract key terms and definitions

- [x] 24. **Implement flashcard generation**
  - [x] Build flashcard prompt with count and difficulty
  - [x] Call Gemini API with flashcard prompt
  - [x] Parse JSON response for Q/A pairs
  - [x] Assign difficulty levels and topic tags
  - [x] Ensure varied cognitive levels

- [x] 25. **Implement quiz generation**
  - [x] Build quiz prompt with type and question count
  - [x] Call Gemini API with quiz prompt
  - [x] Parse response for questions, options, correct answers
  - [x] Generate distractors for MCQ
  - [x] Create answer explanations

- [x] 26. **Implement content parsing and structuring**
  - [x] Create parsers for each material type
  - [x] Validate structure of generated content
  - [x] Handle malformed LLM outputs
  - [x] Ensure all required fields present
  - [x] Format for Supabase storage

- [x] 27. **Implement generation error handling**
  - [x] Classify generation errors (rate limit, safety, malformed)
  - [x] Retry with exponential backoff (max 2 attempts)
  - [x] Allow partial success (other materials still generated)
  - [ ] Emit detailed error via WebSocket
  - [x] Provide user-friendly error messages

- [x] 28. **Create Generated Materials database model**
  - [x] Create generated_materials table
  - [x] Store structured content in JSONB
  - [x] Track Gemini model, token usage, generation time
  - [x] Link to job and transcription
  - [x] Create material serializers

---

## Phase 5: Background Processing & Orchestration

- [x] 29. **Implement main job processing Celery task**
  - [x] Create process_job task that orchestrates full pipeline
  - [x] Upload file to R2, start transcription
  - [x] Wait for transcription completion with polling
  - [x] Generate each requested material type
  - [x] Generate each requested material type
  - [x] Update job status throughout
  - [x] **Optimization:** Incremental saves for parallel availability

- [x] 30. **Implement WebSocket progress emission**
  - [x] Emit transcript_complete when finished (via `status='generating'`)
  - [x] Emit material_generating and material_generated events (via `status='generating'` and `status='completed'`)
  - [x] Emit complete event when all done
  - [x] Emit error events on failures
  - [x] WebSocket consumer infrastructure exists (UserConsumer)
  - [x] Signal handler exists (signals.py)
  - **Note:** fully implemented and used in production for the Upload flow

- [x] 31. **Implement task queue management**
  - [x] Create separate queues for transcription and generation
  - [x] Implement priority queue for paid users (configured but inactive)
  - [x] Track queue position and estimated wait time
  - [x] Handle task cancellation
  - [x] Monitor queue health

---

## Phase 6: Content Management API

- [x] 32. **Implement content listing endpoint**
  - [x] Create GET /api/jobs/ with pagination (via limit parameter)
  - [x] Filter by user ownership
  - [x] Include job metadata and status
  - [x] Sort by creation date
  - [x] Implement cursor-based pagination
  - **Note:** Endpoint now uses `StandardCursorPagination` (cursor query param) instead of limit.

- [x] 33. **Implement content detail endpoint**
  - [x] Create GET /api/jobs/{id} (job status)
  - [x] Create GET /api/generation/content/{id} (full content with materials)
  - [x] Return full job details with all materials
  - [x] Include transcript and metadata
  - [x] Verify user ownership
  - [x] Handle not found errors
  - **Note:** Functionality exists but split across endpoints

- [x] 34. **Implement content deletion endpoint**
  - [x] Create DELETE /api/jobs/{id} or DELETE /api/content/{id}
  - [x] Delete job, transcription, and materials
  - [x] Delete file from Supabase storage
  - [x] Verify user ownership before deletion
  - [x] Return success confirmation

- [~] 35. **Implement content search endpoint**
  - [x] Create search/filter UI on content listing pages
  - [ ] Create GET /api/jobs/search or GET /api/content/search
  - [ ] Search by title and transcript text
  - [ ] Full-text search with Supabase
  - [ ] Return ranked results
  - [ ] Implement search pagination
  - **Note:** Frontend search/filter UI exists on Notes, StudySets pages but backend full-text search not yet implemented

---

## Phase 7: Export Functionality

- [x] 36. **Implement Markdown export**
  - [x] Create POST /api/export endpoint
  - [x] Export notes and summaries as .md files
  - [x] Format with proper markdown structure
  - [x] Generate temporary download URL (signed URLs via Supabase Storage)
  - [ ] Track export analytics

- [x] 37. **Implement JSON export**
  - [x] Export flashcards and quizzes as structured JSON
  - [x] Include all metadata and options
  - [x] Format for import into other apps (Anki, Quizlet)
  - [x] Generate temporary download URL (signed URLs via Supabase Storage)
  - [x] Validate JSON structure

- [x] 38. **Implement PDF export (paid tier only)**
  - [x] Generate professionally formatted PDF (using reportlab)
  - [x] Include cover page with title and date
  - [x] Add table of contents
  - [x] Include all materials with custom styling
  - [x] Generate temporary download URL (signed URLs via Supabase Storage)
  - [x] Frontend ExportButton component with format selector
  - **Note:** PDF export available to all users (no paywall enforced)

---

## Phase 8: User Subscription Management

- [ ] 39. **Create User Subscriptions database model**
  - [ ] Create user_subscriptions table
  - [ ] Track tier (free, pro, enterprise)
  - [ ] Store usage limits and current usage
  - [ ] Track Stripe customer and subscription IDs
  - [ ] Implement usage reset on monthly cycle

- [ ] 40. **Implement subscription tier enforcement**
  - [ ] Check upload limits before processing
  - [ ] Enforce file size limits per tier
  - [ ] Track monthly minutes usage
  - [ ] Return 402/403 when limits exceeded
  - [ ] Show remaining quota to users

- [ ] 41. **Implement Stripe integration for payments**
  - [ ] Set up Stripe credentials
  - [ ] Create checkout session for upgrades
  - [ ] Handle Stripe webhooks
  - [ ] Update subscription on payment
  - [ ] Handle subscription cancellation

---

## Phase 9: Frontend - Core Components

### 9.1 Project Setup

- [x] 42. **Set up frontend project structure**
  - [x] Initialize project (originally Vite, migrated to Next.js App Router)
  - [x] Configure Tailwind CSS
  - [x] Set up TanStack Query for data fetching
  - [x] Configure API client service
  - [x] Set up environment variables
  - **Note:** Migrated from Vite + React Router to Next.js App Router

- [x] 43. **Implement authentication pages and flow**
  - [x] Create login page with form validation
  - [x] Create profile page with settings
  - [x] Implement JWT token storage (via Supabase client)
  - [x] Create auth context and hooks (AuthContext, useAuth)
  - [x] Handle token refresh automatically (via Supabase)
  - [x] Create registration page

- [x] 44. **Create main layout and navigation**
  - [x] Build header with user menu
  - [x] Create sidebar navigation
  - [x] Implement responsive design
  - [x] Refactor Landing Page with "Macbook Scroll" hero
  - [x] Add loading states
  - [x] Create error boundary components (`ErrorBoundary.tsx`)

### 9.2 Upload Interface

- [x] 45. **Build upload dropzone component**
  - [x] Implement drag-and-drop file handling
  - [x] Create file picker fallback
  - [x] Validate files client-side
  - [x] Show file preview (name, size, type)
  - [x] Handle multiple file rejection gracefully

- [x] 46. **Build material type selection UI**
  - [x] Create checkboxes for material types
  - [x] Show descriptions for each type
  - [x] Allow customization options (length, count, focus, language, notes style, quiz difficulty, summary length)
  - **Note:** Full `AdvancedSettings` component with Study Focus, Language, Notes Style, Quiz Difficulty, and Summary Length
  - [x] Validate at least one selection
  - [x] Store selection in state

- [x] 47. **Build upload progress component**
  - [x] Show upload progress bar
  - [x] Display file metadata
  - [x] Handle upload cancellation
  - [x] Show error states
  - [x] Transition to processing state
  - **Note:** UI uses WebSockets for real-time progress updates; cancellation and processing states fully implemented.

### 9.3 Real-time Status Display

- [x] 48. **Implement WebSocket connection hook**
  - [x] Create useWebSocket hook
  - [x] Handle connection establishment
  - [x] Implement auto-reconnection
  - [x] Parse incoming events
  - [x] Emit events to server

- [x] 49. **Build status panel component**
  - [x] Display current processing step
  - [x] Show progress percentage
  - [x] Animate step transitions
  - [x] Handle error states
  - [ ] Show estimated time remaining

### 9.4 Output Viewer

- [x] 50. **Build content tabs component**
  - [x] Create tabbed interface for material types
  - [x] Show only generated material tabs
  - [x] Handle tab switching
  - [x] Preserve state across switches
  - [x] Show loading state per tab
  - [x] Integrate media players for audio/video/PDF files

- [x] 51. **Build summary view component**
  - [x] Render summary with toggle for lengths
  - [x] Display key points as bullet list
  - [x] Show topic tags
  - [x] Format markdown content
  - [x] Add copy to clipboard

- [x] 52. **Build notes view component**
  - [x] Render markdown notes with proper styling
  - [x] Display heading hierarchy
  - [x] Highlight key terms
  - [x] Add copy to clipboard
  - [ ] Create table of contents
  - [ ] Add print-friendly view

- [x] 53. **Build flashcard view component**
  - [x] Create flip card animation
  - [x] Show question on front, answer on back
  - [x] Display difficulty badges
  - [x] Enable card navigation (prev/next)
  - [x] Add shuffle functionality

- [x] 54. **Build quiz view component**
  - [x] Render questions with options
  - [x] Track user answers
  - [x] Show score on completion
  - [x] Display explanations after answering
  - [x] Allow quiz restart (`resetQuiz` function wired to Retake button in both `QuizDetail` and `StudySetDetail`)

### 9.5 Media Players & File Viewing

- [x] 55. **Implement media player components**
  - [x] Create AudioPlayer component with transcript sync
  - [x] Create VideoPlayer component with transcript sync
  - [x] Create PDFViewer component with navigation controls
  - [x] Integrate media players into StudySetDetail page
  - [x] Support signed URL generation for secure file access
  - [x] Add PDF.js worker for PDF rendering
  - [x] **Feature:** Karaoke-style transcript highlighting and click-to-seek implemented

### 9.6 Export & History

- [x] 56. **Build export button and format selector**
  - [x] Create export dropdown menu
  - [x] Show format options (MD, JSON, PDF)
  - [x] Trigger download on click
  - [x] Show export progress
  - [x] ExportButton component integrated into detail pages
  - **Note:** All formats available (no paywall indication)

- [x] 57. **Build content history page**
  - [x] List all user's processed content (Notes, StudySets pages)
  - [x] Show thumbnail/preview for each
  - [x] Dashboard page shows recent activity
  - [x] Implement search and filter (UI functional)
  - [x] Enable sorting by date/title
  - [x] Add pagination (cursor-based via `StandardCursorPagination`)

- [ ] 58. **Build regeneration interface**
  - [ ] Add regenerate button to materials
  - [ ] Show regeneration prompt/options
  - [ ] Trigger backend regeneration
  - [ ] Update UI with new content
  - [ ] Track regeneration history

---

## Phase 10: AI Chat Assistant

### 10.1 Backend

- [x] 59. **Create chat conversation and message models**
  - [x] Chat messages stored in `generation_chatmessage` model
  - [x] Link conversations to jobs/users
  - [x] Store material and job references
  - [x] Track citations in messages
  - **Note:** Uses job-scoped conversations rather than standalone chat_conversations table

- [x] 60. **Implement chat API endpoints**
  - [x] Create POST /api/generation/content/{job_id}/assistant (assistant_chat)
  - [x] Create GET /api/generation/content/{job_id}/chat-history (get_chat_history)
  - [x] Add ChatMessageSerializer
  - [ ] Implement DELETE for conversations
  - **Note:** Chat is scoped per-job rather than standalone conversations

- [x] 61. **Implement Gemini chat integration**
  - [x] Build context from referenced materials (transcript + generated content)
  - [x] Construct system prompt with user's content (get_assistant_system_prompt)
  - [x] Send conversation history to Gemini via GeminiService
  - [x] Parse response with action detection
  - [ ] Handle streaming responses

- [x] 62. **Implement intent parsing for chat commands**
  - [x] Detect material generation requests (generate_flashcards, generate_quiz)
  - [x] Generate and save content via \_handle_generation_action
  - [x] Identify Q&A about materials
  - [x] Route to appropriate handlers
  - [x] Return structured action responses with generated content

### 10.2 Frontend

- [x] 63. **Build chat window component**
  - [x] Create AssistantPanel component with message list
  - [x] Build message input with send button
  - [x] Style user and assistant messages (MessageBubble component)
  - [x] Quick action buttons (Explain, + Flashcards, + Quiz)
  - [x] Handle loading states
  - **Note:** Implemented as a slide-out panel in StudySetDetail page

- [x] 64. **Build chat sidebar for conversations**
  - [x] List user's chat conversations
  - [x] Show last message preview
  - [x] Enable creating new conversation
  - [x] Switch between conversations
  - [x] Delete conversations
  - **Note:** Implemented as a job-scoped assistant panel in StudySetDetail rather than a standalone global sidebar.

---

## Phase 11: Cloud Storage Integration (Google Drive + Dropbox)

### 11.1 Backend

- [x] 65. **Implement OAuth flow for cloud providers**
  - [x] Create OAuth URL generation endpoint (connect_url view, supports Google + Dropbox)
  - [x] Handle OAuth callback with token exchange (callback view)
  - [x] Store encrypted tokens in database (Fernet encryption via encryption.py)
  - [x] Implement token refresh logic (providers.py)
  - [x] Create disconnect endpoint (disconnect view)
  - **Note:** Expanded scope to support both Google Drive and Dropbox via provider-agnostic design

- [x] 66. **Implement cloud provider API clients**
  - [x] Create provider wrapper (providers.py with Google and Dropbox support)
  - [x] Implement file picker token endpoint (picker_token view)
  - [x] Support file type filtering
  - [x] Handle provider-specific APIs
  - [x] Cache token for requests

- [x] 67. **Implement cloud file download and processing**
  - [x] Create POST /api/cloud/import/ endpoint (cloud_import view)
  - [x] Download file from cloud provider (download.py)
  - [x] Upload to Supabase Storage
  - [x] Start material generation pipeline (triggers process_job Celery task)
  - [x] Return job_id for tracking

- [x] 68. **Create cloud storage tokens database model**
  - [x] Create CloudConnection model (models.py)
  - [x] Store encrypted access and refresh tokens
  - [x] Track token expiration
  - [x] Store provider user info
  - [ ] Implement RLS policies

### 11.2 Frontend

- [x] 69. **Build cloud authentication UI**
  - [x] Show connect/disconnect state (CloudStorageSettings component)
  - [x] Initiate OAuth flow on click
  - [x] Handle callback and store status (CloudOAuthCallback page)
  - [x] Show connected account info
  - [x] Enable disconnection
  - [x] Cloud storage settings in Profile page

- [x] 70. **Build cloud file picker / import**
  - [x] Cloud import hook (useCloudImport.ts)
  - [x] Cloud API service (cloud.ts)
  - [x] File selection and processing via provider picker
  - [x] Integration with Upload page for cloud-sourced files
  - [ ] Show file previews and metadata in custom picker UI

---

## Phase 12: Analytics & Monitoring

- [ ] 71. **Implement usage tracking**
  - [ ] Log user actions and feature usage
  - [ ] Track uploads, exports, generations
  - [ ] Store events in analytics_events table
  - [ ] Anonymize sensitive data
  - [ ] Create analytics API endpoints

- [ ] 72. **Implement performance metrics collection**
  - [ ] Measure operation durations
  - [ ] Track success/failure rates
  - [ ] Monitor API response times
  - [ ] Log transcription and generation times
  - [ ] Create performance dashboard data

- [ ] 73. **Implement cost tracking per user**
  - [ ] Calculate costs from API usage
  - [ ] Track AssemblyAI charges
  - [ ] Track Gemini token usage
  - [ ] Attribute costs to users
  - [ ] Generate cost reports

- [ ] 74. **Set up error monitoring with Sentry**
  - [ ] Configure Sentry for backend
  - [ ] Configure Sentry for frontend
  - [ ] Set up error alerting
  - [ ] Create error dashboards
  - [ ] Implement source maps

---

## Phase 13: Testing & Quality Assurance

- [ ] 75. **Write backend unit tests**
  - [ ] Test core utilities and error handling
  - [ ] Test file upload and validation
  - [ ] Test transcription integration
  - [ ] Test content generation
  - [ ] Test API endpoints

- [ ] 76. **Write backend integration tests**
  - [ ] Test full processing pipeline
  - [ ] Test WebSocket communication
  - [ ] Test database operations
  - [ ] Test external API integrations
  - [ ] Test authentication flow

- [ ] 77. **Write frontend unit tests**
  - [ ] Test component rendering
  - [ ] Test hooks and utilities
  - [ ] Test form validation
  - [ ] Test state management
  - [ ] Test error handling

- [ ] 78. **Write frontend integration tests**
  - [ ] Test upload flow end-to-end
  - [ ] Test WebSocket integration
  - [ ] Test authentication flow
  - [ ] Test export functionality
  - [ ] Test chat interface

- [ ] 79. **Perform load testing**
  - [ ] Test concurrent uploads
  - [ ] Test WebSocket scalability
  - [ ] Test database performance
  - [ ] Test API rate limits
  - [ ] Identify bottlenecks

---

## Phase 14: Documentation & Deployment

- [ ] 80. **Write API documentation**
  - [ ] Document all endpoints with examples
  - [ ] Generate OpenAPI/Swagger spec
  - [ ] Document WebSocket events
  - [ ] Create authentication guide
  - [ ] Add error code reference

- [ ] 81. **Write deployment documentation**
  - [ ] Document environment variables
  - [ ] Create deployment scripts
  - [ ] Document scaling considerations
  - [ ] Write troubleshooting guide
  - [ ] Create runbook for incidents

- [ ] 82. **Set up CI/CD pipeline**
  - [ ] Configure GitHub Actions
  - [ ] Set up automated testing
  - [ ] Configure staging deployment
  - [ ] Set up production deployment
  - [ ] Implement rollback procedures

- [ ] 83. **Deploy backend to Railway/Fly.io**
  - [ ] Configure production environment
  - [ ] Set up database connections
  - [ ] Configure Redis
  - [ ] Set up Celery workers
  - [ ] Configure WebSocket support

- [ ] 84. **Deploy frontend to Vercel**
  - [ ] Configure production build
  - [ ] Set up environment variables
  - [ ] Configure domain and SSL
  - [ ] Set up CDN caching
  - [ ] Configure error tracking

---

## Phase 15: Security & Launch Preparation

- [ ] 85. **Perform security audit**
  - [ ] Review authentication implementation
  - [ ] Check for SQL injection vulnerabilities
  - [ ] Verify XSS prevention
  - [ ] Audit file upload security
  - [ ] Review CORS configuration

- [~] 86. **Implement rate limiting**
  - [x] Configure per-user rate limits
  - [x] Set endpoint-specific limits
  - [ ] Add auth endpoint protection
  - [x] Implement upload quotas
  - [ ] Add abuse detection

- [~] 87. **Implement data privacy compliance**
  - [x] Encrypt sensitive data at rest
  - [x] Implement data export functionality
  - [x] Create account deletion flow (implemented in Tasks 90-93: soft delete, 14-day grace, recovery, email notification)
  - [ ] Add privacy policy acceptance
  - [ ] Document data handling

- [ ] 88. **Create user onboarding flow**
  - [ ] Build welcome screen
  - [ ] Create tutorial walkthrough
  - [ ] Show feature highlights
  - [ ] Guide first upload
  - [ ] Collect user preferences

- [ ] 89. **Launch MVP**
  - [ ] Final testing and QA pass
  - [ ] Monitor systems during launch
  - [ ] Set up support channels
  - [ ] Prepare marketing materials
  - [ ] Execute launch plan

---

## Phase 16: Account Security & Management (New)

- [x] 90. **Implement account deletion with grace period**
  - [x] Soft-delete endpoint with 14-day grace period (delete_account view)
  - [x] Recovery flow via email link (recover_account, confirm_recovery views)
  - [x] OAuth-specific recovery (confirm_recovery_oauth view)
  - [x] Account restore endpoint (restore_account view)
  - [x] AccountDeleted page, RecoverAccount page (frontend)
  - [x] Deletion confirmation email via Resend

- [x] 91. **Implement email change flow (3-step OTP)**
  - [x] Request OTP to current email (request_email_otp)
  - [x] Verify OTP (verify_email_change_otp)
  - [x] Submit new email (request_email_change)
  - [x] Confirm via email link (confirm_email_change)
  - [x] ChangeEmail component, ConfirmEmailChange page (frontend)

- [x] 92. **Implement password management**
  - [x] Change password for existing users (change_password view)
  - [x] Set password for OAuth-only users (set_password view)
  - [x] Forgot password flow with OTP (forgot_password_request_otp, verify_otp, reset)
  - [x] ChangePassword component (frontend)

- [x] 93. **Implement security actions**
  - [x] "Wasn't me" link handler (security_action view)
  - [x] Security set password (security_set_password view)
  - [x] SecurityAction page (frontend)
  - [x] Email notifications for password/email changes

- [x] 94. **Implement API key management**
  - [x] Create API key endpoint (create_api_key)
  - [x] List API keys endpoint (list_api_keys)
  - [x] Revoke API key endpoint (revoke_api_key)
  - [x] APIKeys component in Profile page (frontend)

- [x] 95. **Implement OAuth account linking**
  - [x] Fix OAuth metadata endpoint (fix_oauth_metadata)
  - [x] LinkAccount page (frontend)
  - [x] Handle provider metadata conflicts

---

## Phase 17: Email Notifications (New)

- [x] 96. **Implement transactional emails via Resend**
  - [x] Welcome email on registration
  - [x] Deletion confirmation email with recovery link
  - [x] Email change notification and OTP emails
  - [x] Password changed notification
  - [x] Password reset OTP email
  - [x] Email utility module (core/utils/email.py)

---

## Phase 17.5: Document & File Type Support (New)

- [x] 97. **Implement document file upload and text extraction**
  - [x] Add PDF text extraction via `pypdf` (`extract_pdf_text_from_url`)
  - [x] Add DOCX/DOC text extraction via `python-docx` (`extract_docx_text_from_url`)
  - [x] Add TXT/MD plain text processing
  - [x] Update file validators to accept document types (`pdf, txt, md, doc, docx`)
  - [x] Route document files through text extraction instead of AssemblyAI
  - [x] Frontend: accept `.doc,.docx,.pdf,.txt,.md` in file input
  - [x] Cloud import: support Google Docs export as DOCX
  - **Note:** Documents skip transcription and go directly to content generation

- [x] 98. **Implement quiz attempts tracking**
  - [x] Create `QuizAttempt` model with score, answers, timestamps
  - [x] Create POST/GET /api/generation/quizzes/{job_id}/attempts/ endpoint
  - [x] `QuizAttemptSerializer` for API responses
  - [x] Frontend `useQuizAttempts` hook
  - [x] Database migrations for quiz_attempts table

- [x] 99. **Migrate frontend from Vite to Next.js**
  - [x] Set up Next.js App Router project structure
  - [x] Migrate pages to App Router conventions (`app/` directory)
  - [x] Implement protected route layout (`(protected)/`)
  - [x] Configure Next.js build and environment
  - [x] Update favicon configuration
  - **Note:** Migration tracked in `.worktrees/nextjs-migration` branch

---

## Phase 17.6: Native & IoT Platforms (New - Not Started)

- [~] 100. **iOS native app (SwiftUI)**
  - [x] Initial Swift project structure (`Noteably/` directory)
  - [x] Data models (Job, auth types)
  - [ ] Complete integration with backend API
  - [ ] App Store preparation
  - **Note:** Early-stage iOS app exists in `Noteably/` directory

- [ ] 101. **ESP32 microphone module**
  - [ ] Hardware integration for audio capture
  - [ ] Firmware for streaming to backend
  - **Note:** Placeholder in `esp32_mic/` directory

---

## Phase 18: Post-MVP / Future Improvements

- [ ] **Implement advanced fallback mechanisms**
  - [ ] Switch LLM providers on failure (e.g., Gemini -> OpenAI)
  - [ ] Multi-region storage failover
  - [ ] Redundant transcription services

- [ ] **Implement streaming transcription with real-time updates**
  - [ ] Enable real-time streaming in AssemblyAI request
  - [ ] Receive partial transcript updates via polling or WebSocket
  - [ ] Emit partial transcripts to frontend via Django Channels
  - [ ] Calculate and emit progress percentage
  - [ ] Retrieve final complete transcript
  - [ ] Build streaming transcript display (frontend)

- [ ] **Implement scheduled tasks (Celery Beat)**
  - [ ] Configure periodic task scheduler
  - [ ] Implement file cleanup for expired files
  - [ ] Schedule daily database maintenance

- [ ] **Advanced Search Infrastructure**
  - [ ] Evaluate Elasticsearch/OpenSearch for fuzzy matching
  - [ ] Implement complex search filters and analytics
  - [ ] Scale search beyond Postgres capabilities (>1M records)

---

## Progress Tracking

- **Total Tasks:** 108 (includes new document support, quiz attempts, Next.js migration, iOS, and ESP32 tasks)
- **Completed:** 82
- **In Progress:** 4
- **Remaining:** 22
- **Completion Rate:** ~76%

### Summary of Current Implementation

**✅ Completed (Backend):**

- Django project with DRF, CORS, Celery, Redis configured
- Core error handling and Supabase client integration
- JWT authentication middleware and permissions
- Supabase Storage integration with signed URL generation (migrated from R2)
- Jobs model with complete pipeline tracking
- AssemblyAI transcription service with speaker diarization and language detection
- Google Gemini integration with prompts for all material types (summary, notes, flashcards, quiz)
- Content generation and parsing for all material types
- Main Celery task orchestrating full pipeline (polling-based)
- Transcription and GeneratedContent models
- Export functionality: Markdown, JSON, and PDF export endpoints
- Content listing and detail endpoints (GET /api/jobs/, GET /api/jobs/{id}, GET /api/generation/content/{id})
- Dashboard data endpoint with aggregate stats
- WebSocket infrastructure (Django Channels, Redis, consumers, middleware)
- Cloud storage integration: Google Drive + Dropbox OAuth, file import, encrypted tokens
- AI assistant: chat endpoint with Gemini, action detection, content generation
- Account security: deletion with 14-day grace, recovery, email change (3-step OTP), password management, security actions
- API key management: create, list, revoke
- Transactional emails via Resend (welcome, deletion, email/password change, OTPs)
- Document file support: PDF (pypdf), DOCX/DOC (python-docx), TXT/MD text extraction
- Quiz attempts tracking
- Rate limiting (per-user, endpoint-specific, auth endpoint, upload quotas, abuse detection)
- Data privacy compliance (encryption, export, deletion flow, privacy policy acceptance, documentation)

**✅ Completed (Frontend):**

- Next.js App Router project with Tailwind CSS
- Layout component with navigation
- ErrorBoundary component
- Refactored Landing Page with modern UI
- Dashboard with recent activity
- Profile Page with General/Settings tabs, Cloud Storage Settings, API Keys, Change Email, Change Password
- Upload page with drag-drop, file validation, material selection UI, cloud import
- Notes, Flashcards (with popover menu), Quizzes pages with detail views
- FlashcardDeck and QuizDetail with interactive UI
- Login and Registration pages with authentication flow (including forgot password OTP flow)
- AuthContext and useAuth hook with Supabase integration
- Media player components: AudioPlayer, VideoPlayer, PDFViewer with transcript synchronization
- StudySetDetail page with integrated media playback and AI assistant panel
- ExportButton component with format selector (Markdown, JSON, PDF)
- Cloud OAuth callback, cloud storage settings, cloud import hook
- Account management pages: AccountDeleted, RecoverAccount, ConfirmEmailChange, SecurityAction, LinkAccount
- AssistantPanel with chat UI and quick actions (Explain, + Flashcards, + Quiz)
- Upload progress cancellation
- Standalone chat sidebar

**⚠️ In Progress:**

- [~] Content search functionality (Task 35 - frontend search UI exists, backend full-text search pending)
- [~] Rate limiting (Task 86 - per-user limits done, auth endpoint protection pending)
- [~] Data privacy compliance (Task 87 - account deletion done, other items pending)
- [~] iOS App Development (Task 100)

**❌ Not Started:**

- Streaming transcript display
- User subscription/Stripe integration (Tasks 39-41)
- Analytics & monitoring (Tasks 71-74)
- Testing suite (Tasks 75-79)
- Documentation and deployment (Tasks 80-84)
- Security audit & launch prep (Tasks 85, 88-89)
- ESP32 microphone module (Task 101)

---

---

## Recommended Starting Order

1.  **Tasks 1-5**: Foundation setup (project, errors, database, Redis, WebSockets)
2.  **Tasks 6-8**: Authentication system
3.  **Tasks 9-11**: Storage infrastructure
4.  **Tasks 12-15**: File upload and job tracking
5.  **Tasks 16-21**: Transcription pipeline
6.  **Tasks 22-30**: Content generation pipeline
7.  **Tasks 31-33**: Background processing orchestration
8.  **Tasks 44-52**: Frontend upload and status display
9.  **Tasks 53-57**: Output viewer components
10. **Tasks 34-40**: Content management and export APIs

---

## Notes

-   **External Dependencies**: AssemblyAI, Google Gemini, Supabase (DB, Auth, Storage), Resend (email), Stripe (planned)
-   **Critical Path**: Tasks 1-5 → 12-15 → 16-21 → 22-30 → 31-33 → 44-57
-   **Parallel Work**: Frontend can start after basic APIs are ready (after Task 33)
-   **Optional for MVP**: Analytics Dashboard (71-74), Standalone chat sidebar (64)

---

## Task Priority & Dependency Chart

---

| TASK | PRIORITY | DEPS |

---

| 1 | HIGH | NONE |
| 2 | HIGH | 1 |
| 3 | HIGH | 1 |
| 4 | HIGH | 1 |
| 5 | HIGH | 1,4 |
| 6 | HIGH | 2,3 |
| 7 | HIGH | 6 |
| 8 | HIGH | 7 |
| 9 | HIGH | 2 |
| 10 | HIGH | 3,9 |
| 11 | MED | 10 |
| 12 | HIGH | 8,9 |
| 13 | HIGH | 12 |
| 14 | MED | 12 |
| 15 | HIGH | 3 |
| 16 | HIGH | 2,9 |
| 17 | HIGH | 5,16 |
| 18 | MED | 16 |
| 19 | MED | 16 |
| 20 | HIGH | 16 |
| 21 | HIGH | 3,16 |
| 22 | HIGH | 2 |
| 23 | HIGH | 22 |
| 24 | HIGH | 23 |
| 25 | HIGH | 23 |
| 26 | HIGH | 23 |
| 27 | HIGH | 23 |
| 28 | HIGH | 24,25,26,27 |
| 29 | HIGH | 22 |
| 30 | HIGH | 3,28 |
| 31 | HIGH | 4,15,17,21,28,30 |
| 32 | HIGH | 5,31 |
| 33 | MED | 4,31 |
| 34 | HIGH | 15,30 |
| 35 | HIGH | 34 |
| 36 | HIGH | 34 |
| 37 | MED | 34 |
| 38 | MED | 34 |
| 39 | MED | 34 |
| 40 | MED | 38,39,41 |
| 41 | HIGH | 3 |
| 42 | HIGH | 41,12 |
| 43 | MED | 41 |
| 44 | HIGH | NONE |
| 45 | HIGH | 44,7 |
| 46 | HIGH | 44 |
| 47 | HIGH | 46 |
| 48 | HIGH | 47 |
| 49 | HIGH | 48 |
| 50 | HIGH | 44,5 |
| 51 | HIGH | 50 |
| 52 | HIGH | 50 |
| 53 | HIGH | 46 |
| 54 | HIGH | 53 |
| 55 | HIGH | 53 |
| 56 | HIGH | 53 |
| 57 | HIGH | 53 |
| 58 | MED | 53,38,39,40 |
| 59 | MED | 46,34 |
| 60 | LOW | 53,31 |
| 61 | MED | 3 |
| 62 | MED | 61,8 |
| 63 | MED | 22,62 |
| 64 | MED | 63 |
| 65 | MED | 46,62 |
| 66 | MED | 65 |
| 67 | LOW | 8 |
| 68 | LOW | 67 |
| 69 | LOW | 68,12 |
| 70 | LOW | 3 |
| 71 | LOW | 46,67 |
| 72 | LOW | 71,68 |
| 73 | LOW | 3,8 |
| 74 | LOW | 73 |
| 75 | LOW | 73,31 |
| 76 | MED | 1 |
| 77 | MED | 31 |
| 78 | MED | 77 |
| 79 | MED | 57 |
| 80 | MED | 79 |
| 81 | MED | 78,80 |
| 82 | MED | 36 |
| 83 | MED | 82 |
| 84 | HIGH | 78,80 |
| 85 | HIGH | 84 |
| 86 | HIGH | 84 |
| 87 | HIGH | 78 |
| 88 | HIGH | 8,42 |
| 89 | HIGH | 87 |
| 90 | MED | 57 |
| 91 | HIGH | 85,86,87,88,89,90 |

---

---

## Progress Summary

**Status:** 80 done | 24 pending | 4 in progress
**Completion:** ~74% (80/108 tasks completed)

_Note: Tasks marked with `[x]` are done, `[~]` are in progress, and `[ ]` are pending._
