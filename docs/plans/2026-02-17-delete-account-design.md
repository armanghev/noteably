# Delete Account Feature Design

## Overview

Add a "Delete Account" function accessible from the profile/settings page on both web and iOS. Performs a hard delete of the user's account and all associated data immediately, with a confirmation dialog to prevent accidental deletion. Same flow for all users regardless of auth method (email/password or Google OAuth).

## Backend

### New Endpoint: `DELETE /api/auth/me`

- **Auth:** Requires JWT (`IsAuthenticated` permission)
- **Response:** `204 No Content` on success, `500` on failure with details

### Deletion Order

1. **API Keys** — Delete all `APIKey` model records for the user
2. **Supabase Storage** — Remove user's avatar from `avatars` bucket (`{user_id}/avatar.jpg`) and uploaded files from the main storage bucket
3. **Supabase Database** — Delete all rows tied to the user: jobs, generated content, quiz attempts, subscription records
4. **Supabase Auth** — Call `supabase.auth.admin.delete_user(user_id)` to remove the auth account

Partial failures are logged and surfaced as errors rather than silently ignored.

## Web Frontend

### Location

Bottom of the General tab in `Profile.tsx`, below the existing "Sign Out" button.

### UI

- "Delete Account" button (destructive/red variant)
- Confirmation dialog (Radix UI `AlertDialog`):
  - Title: "Delete Account"
  - Description: "This will permanently delete your account and all your data including study sets, flashcards, quizzes, and uploaded files. This action cannot be undone."
  - Buttons: "Cancel" (secondary), "Delete Account" (destructive)
- Loading spinner on button while deletion is in progress
- On success: call `logout()`, redirect to login page
- On error: show toast/error message

### API Integration

Add `deleteAccount()` to `frontend/src/lib/api/services/auth.ts` calling `DELETE /api/auth/me`.

## iOS App

### Location

Bottom of the Account section in `ProfileView.swift`, near the sign out button.

### UI

- "Delete Account" button (red text, `.foregroundColor(.red)`)
- Confirmation alert (`.alert` modifier):
  - Title: "Delete Account"
  - Message: Same warning as web — permanent deletion, cannot be undone
  - Actions: "Cancel" (default), "Delete Account" (`.destructive` role)
- `ProgressView` overlay while deleting
- On success: call `appState.signOut()`, return to login screen
- On error: show error alert

### API Integration

Add `deleteAccount()` to `AuthService.swift` calling `DELETE /api/auth/me`.
