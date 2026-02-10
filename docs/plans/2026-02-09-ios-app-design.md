# Noteably iOS App Design

## Scope

Upload + study hybrid. Full upload support leveraging native iOS capabilities (camera, microphone, Files app) plus all study features (notes, flashcards, quizzes). Settings/profile accessible from dashboard. Admin features deferred.

## Decisions

| Decision | Choice |
|----------|--------|
| Auth | Supabase Swift SDK (Keychain session, auto token refresh) |
| Navigation | Tab bar (5 tabs) + NavigationStack drill-downs |
| Real-time | WebSocket (foreground) + Push notifications (background) |
| Offline | Cache study materials locally after first fetch |
| Persistence | JSON-to-disk with Codable + FileManager (no Core Data) |
| Dependencies | supabase-swift (SPM). WebSocket via native URLSessionWebSocketTask |

## Project Structure

```
Noteably/
├── App/
│   ├── NoteablyApp.swift              # Entry point, tab setup, environment injection
│   └── AppState.swift                 # Auth status, connectivity (NWPathMonitor)
├── Models/
│   ├── Job.swift                      # Job, JobStatus enums
│   ├── Content.swift                  # Summary, Note, Flashcard, Quiz, Question
│   ├── User.swift                     # User profile
│   └── DashboardData.swift            # Dashboard stats
├── Services/
│   ├── AuthService.swift              # Supabase auth (login, signup, session)
│   ├── APIClient.swift                # Base HTTP client, token injection, error handling
│   ├── JobsService.swift              # Upload, list, get, delete, retry jobs
│   ├── ContentService.swift           # Fetch generated materials
│   ├── ExportService.swift            # Export markdown/json/pdf
│   ├── QuizService.swift              # Quiz attempts
│   ├── WebSocketService.swift         # Real-time job progress
│   ├── PushNotificationService.swift  # APNs registration & handling
│   └── CacheService.swift             # JSON-to-disk read/write
├── ViewModels/
│   ├── AuthViewModel.swift
│   ├── DashboardViewModel.swift
│   ├── UploadViewModel.swift
│   ├── StudySetsViewModel.swift
│   ├── StudySetDetailViewModel.swift
│   ├── FlashcardViewModel.swift
│   └── QuizViewModel.swift
├── Views/
│   ├── Auth/                          # LoginView, SignupView
│   ├── Dashboard/                     # DashboardView
│   ├── Upload/                        # UploadView, AudioRecorderView
│   ├── StudySets/                     # StudySetListView, StudySetDetailView
│   ├── Flashcards/                    # FlashcardListView, FlashcardDeckView
│   ├── Quizzes/                       # QuizListView, QuizDetailView, QuizResultsView
│   ├── Profile/                       # ProfileView, SettingsView
│   └── Components/                    # Reusable UI (cards, progress indicators, etc.)
├── Extensions/                        # Date formatters, Color helpers
└── Resources/
    └── Assets.xcassets
```

## Auth Flow

```
Launch → Check Supabase session (Keychain)
  ├── Valid session → MainTabView
  └── No session → AuthView (Login / Signup toggle)
```

- Supabase Swift SDK handles session persistence via Keychain and automatic token refresh.
- `AppState` is an `@Observable` class injected at app root. Holds `isAuthenticated`, `userId`, `isConnected`.
- `APIClient` grabs the current access token from Supabase session for every request.
- Backend requires zero changes — it already validates Supabase JWTs.

```swift
@main
struct NoteablyApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            if appState.isAuthenticated {
                MainTabView()
            } else {
                AuthView()
            }
        }
        .environment(appState)
    }
}
```

## Navigation

### Tab Bar (5 tabs)

| Tab | Icon | Purpose |
|-----|------|---------|
| Home | house | Dashboard: stats, recent activity, profile access via top-right avatar |
| Upload | plus.circle | File picker (Files/camera roll/audio recorder), material type selection, progress |
| Notes | doc.text | List of study sets with search/filter, drill into detail (summary, notes, transcript) |
| Cards | rectangle.on.rectangle | Flashcard deck list, drill into swipe-based study mode |
| Quizzes | questionmark.circle | Quiz list with scores, drill into interactive quiz flow |

Each tab has its own `NavigationStack`. Profile/Settings accessed from avatar icon on Home tab.

### Profile Screen (from Home top-right avatar)

- Account: email, sign out
- Preferences: appearance (light/dark/system), notifications
- Subscription: current plan, usage/quota
- About: app version, support link

## Key Screens

### Upload Flow

1. **File selection** via native pickers:
   - `UIDocumentPickerViewController` for PDF, TXT, audio, video from Files/iCloud
   - `PHPickerViewController` for camera roll video/audio
   - In-app audio recorder using `AVAudioEngine` (record lectures directly)
2. **Material type selection** via toggle chips (summary, notes, flashcards, quiz)
3. **Tap "Generate"** → upload begins
4. **Real-time progress** via WebSocket (uploading → transcribing → generating → done)
5. **Completion** → "View Study Set" button appears
6. **Backgrounded** → push notification on completion

### Flashcard Study Mode

- Full-screen card display
- Tap to flip (front: term, back: definition)
- Swipe right/left for next/previous
- Progress bar at top (card N of M)
- Shuffle toggle

### Quiz Mode

- One question per screen, multiple choice
- Tap answer → immediate feedback (green/red highlight + correct answer)
- "Next" button to advance
- Final results screen with score and percentage
- Retake option
- Attempt saved to backend

### Dashboard

- Greeting + quick stats (total notes, flashcards, quizzes taken)
- Upload shortcut card
- Recent activity (last 5 jobs, tap to drill in)
- Profile avatar in top-right nav bar

## Networking

### APIClient

- `URLSession`-based, no third-party HTTP library
- Base URL: Django backend
- Auto-injects `Authorization: Bearer <token>` from Supabase session
- JSON encoding/decoding with `Codable`
- Typed errors: unauthorized, not found, server error, network unavailable

### WebSocketService

- Native `URLSessionWebSocketTask`
- Connects to `/ws/user/?token=<jwt>` on foreground
- Publishes job status updates as stream for ViewModels to subscribe
- Disconnects on background
- Reconnects with 3-second retry

## Caching & Offline

### CacheService

- Directory: `Application Support/Noteably/cache/`
- Files: `content_{jobId}.json`, `jobs_list.json`, `dashboard.json`
- Write after every successful API fetch of study content
- Read from cache first on launch or when offline, then refresh from network
- Overwrite on fresh fetch. Delete when job is deleted.
- No TTL — study materials don't change after generation

### Offline Behavior

- Study materials (notes, flashcards, quizzes): fully functional offline once cached
- Dashboard/job list: show cached version with subtle "offline" indicator
- Upload: requires connectivity, show clear message if offline
- Quiz attempts: queue locally, sync when connectivity returns

## Push Notifications

### iOS Side

- Register for APNs after auth, send device token to backend
- Permission prompt shown after first successful upload (user has context)
- Tapping notification deep-links to study set detail for that job

### Backend Changes Required

- New model: `DeviceToken(user_id, token, platform, created_at)`
- New endpoints: `POST /api/devices/register`, `DELETE /api/devices/unregister`
- In Celery task after job `completed`/`failed`, send APNs push
- Payload: `{ job_id, title: "Study materials ready", body: "Your notes for <filename> are ready" }`
- Library: `django-push-notifications` or direct APNs HTTP/2

## API Endpoints Used

All existing endpoints — no backend changes needed except push notification registration:

```
POST   /api/process                  Upload file
GET    /api/jobs/                    List jobs
GET    /api/jobs/<uuid>/             Get job details
GET    /api/jobs/<uuid>/signed-url/  Signed file URL
DELETE /api/jobs/<uuid>/             Delete job
POST   /api/jobs/<uuid>/retry/       Retry failed job
GET    /api/dashboard/               Dashboard stats
GET    /api/content/<job_id>         Generated content
GET    /api/content/<job_id>/attempts Quiz attempts
POST   /api/content/<job_id>/attempts Save quiz attempt
POST   /api/export                   Export
GET    /api/auth/me                  User profile
GET    /api/auth/subscription        Subscription status
WS     /ws/user/?token=<jwt>         Real-time updates

# New (for push notifications):
POST   /api/devices/register         Register device token
DELETE /api/devices/unregister       Unregister device token
```
