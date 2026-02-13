# Signup Flow Redesign

**Date:** 2026-02-11
**Branch:** feature/signup-flow

## Overview

Redesign the signup flow across web (React) and iOS (SwiftUI) to support OAuth-first authentication with profile completion. Add Google OAuth, placeholder Apple OAuth, and collect first name, last name, and optional phone number.

## Data Model

Store all profile fields in Supabase Auth's `user_metadata`:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+15551234567",
  "profile_completed": true,
  "avatar_url": "..."
}
```

No new Django models or Supabase tables needed.

## Signup Flow (Web & iOS)

### Screen 1: Auth Method Selection

- "Continue with Google" button (Supabase client-side OAuth)
- "Continue with Apple" button (placeholder — shows "Coming soon")
- Divider ("or")
- Email + Password + Confirm Password form
- "Sign up" button
- "Already have an account? Sign in" link

### Screen 2: Complete Your Profile

- First Name* (pre-filled from Google `given_name` if available, editable)
- Last Name* (pre-filled from Google `family_name` if available, editable)
- Phone Number (optional)
- "Continue" button → Dashboard

### Key Behaviors

- Google OAuth: `supabase.auth.signInWithOAuth({ provider: 'google' })` on web, ASWebAuthenticationSession on iOS
- After any signup method, check `user_metadata.profile_completed` — if falsy, show profile completion
- Returning users with completed profiles skip to dashboard
- Google OAuth data auto-fills name fields (editable)
- First and last name are required. Phone is always optional.

## Backend Changes

### New Endpoint: `POST /api/auth/complete-profile`

- **Auth:** Required (IsAuthenticated)
- **Body:** `{ first_name: string, last_name: string, phone_number?: string }`
- **Action:** Calls `supabase.auth.admin.update_user_by_id(user_id, { user_metadata: { first_name, last_name, phone_number, profile_completed: true } })` using service role key
- **Response:** Updated user object

### Modified: `GET /api/auth/me`

- Include `first_name`, `last_name`, `phone_number`, `profile_completed` from `user_metadata` in response

### No changes to existing signup/login endpoints

## Web Frontend Changes

| File | Change |
|------|--------|
| `pages/Signup.tsx` | Redesign: OAuth buttons + email/password form |
| `pages/CompleteProfile.tsx` | **New:** Profile completion form |
| `contexts/AuthContext.tsx` | Add `signInWithGoogle()`, profile completion redirect logic |
| `router/index.tsx` | Add `/complete-profile` protected route |
| `lib/api/services/auth.ts` | Add `completeProfile()` function |
| `types/index.ts` | Add `CompleteProfileRequest` type |

## iOS Changes

| File | Change |
|------|--------|
| `Views/Auth/SignUpView.swift` | Redesign: OAuth buttons + email/password form |
| `Views/Auth/CompleteProfileView.swift` | **New:** Profile completion screen |
| `Services/AuthService.swift` | Add `signInWithGoogle()`, `completeProfile()` |
| `App/AppState.swift` | Add `needsProfileCompletion`, update root view logic |

## OAuth Configuration Required

- Enable Google OAuth provider in Supabase Dashboard (Authentication → Providers → Google)
- Configure Google Cloud OAuth consent screen + credentials
- Set redirect URL in Google Cloud Console to Supabase's callback URL
- For iOS: configure URL scheme for OAuth callback
