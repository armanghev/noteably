# Account Management Features Design

## Overview

Expand the existing Profile page with full account management: edit name, change phone number, change email, change/set password. Inline editing UX with security notifications for sensitive changes.

## Profile Page Layout

The Profile page gains an **Account** section between the avatar/info area and the Theme section. Three subsections with inline editing (read-only text + Edit button, swaps to input fields with Save/Cancel):

### Personal Information

- **First Name / Last Name** — side by side, Edit swaps both to inputs. Required, 1-50 chars each.
- **Phone Number** — same inline edit pattern. Optional, no verification for now. Backend returns `phone_verified: false` so the frontend can show a "Verify" badge later when SMS support is added.

### Email

- Current email displayed as text with "Change" button.
- Clicking Change expands inline form: current password, new email, confirm new email.
- On submit: Supabase sends confirmation link to the **new** email. Email only updates after clicking that link.
- Security notification sent to the **old** email with a "wasn't me" link.
- OAuth-only users without a password: Change button disabled with tooltip "Set a password first to change your email."

### Password

- Email/password users: shows "••••••••" with "Change" button. Expands to: current password, new password, confirm new password. Validation: 8+ chars, uppercase letter, digit, must differ from current.
- OAuth-only users: shows "No password set" with "Set Password" button. Expands to: new password, confirm new password (no current password needed). After setting, UI switches to the normal change password view.
- On any change: security notification email sent with "wasn't me" link.

## Backend API

### New Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/me/update-profile` | PATCH | JWT | Update name and/or phone number |
| `/api/auth/me/change-email` | POST | JWT | Initiate email change (requires current password) |
| `/api/auth/me/change-password` | POST | JWT | Change password (requires current password) |
| `/api/auth/me/set-password` | POST | JWT | Set password for OAuth-only users |
| `/api/auth/me/security-action` | POST | None | Handle "wasn't me" link from security emails |

### Update Profile

`PATCH /api/auth/me/update-profile`

- Accepts: `first_name`, `last_name`, `phone_number` (all optional)
- Updates Supabase `user_metadata` directly
- Returns updated profile including `phone_verified: false`

### Change Email

`POST /api/auth/me/change-email`

- Requires: `current_password`, `new_email`
- Verify current password against Supabase
- Call Supabase to initiate email change (sends confirmation to new email)
- Send security notification to old email with "wasn't me" token
- Email only updates after user clicks Supabase confirmation link

### Change Password

`POST /api/auth/me/change-password`

- Requires: `current_password`, `new_password`
- Validates: password strength (8+ chars, uppercase, digit), must differ from current
- Updates via Supabase admin API
- Sends security notification email with "wasn't me" token

### Set Password

`POST /api/auth/me/set-password`

- Only allowed for users with no password (OAuth-only, checked via `app_metadata.provider`)
- Requires: `new_password` only
- Sets password via Supabase admin API

### Security Action

`POST /api/auth/me/security-action`

- Accepts signed JWT token from "wasn't me" email link
- Resets password (generates random one, forces reset on next login)
- Invalidates all Supabase sessions for that user
- No auth required (token-based)

## Security Notification Emails

Two templates sent via Resend:

### Email Changed Notification (sent to old email)

- Subject: "Your Noteably email was changed"
- Body: informs of the change, shows new email, offers "wasn't me" action
- CTA: "Secure My Account" links to `/api/auth/me/security-action?token=<signed_jwt>`

### Password Changed Notification (sent to current email)

- Subject: "Your Noteably password was changed"
- Body: informs of the change, offers "wasn't me" action
- Same CTA and token mechanism

### Token Design

- Signed JWT with `user_id`, `action: "security_reset"`, `issued_at`
- 7-day expiry
- **Stateless one-time use:** check that token's `issued_at` is before the user's last password change. If password was already changed after the token was issued, the token is effectively invalid. No extra DB table needed.

## Frontend Changes

### Auth Service Additions (`auth.ts`)

- `updateProfile(data)` — PATCH /api/auth/me/update-profile
- `changeEmail(data)` — POST /api/auth/me/change-email
- `changePassword(data)` — POST /api/auth/me/change-password
- `setPassword(data)` — POST /api/auth/me/set-password

### Profile Page (`Profile.tsx`)

- Personal Information section with inline editing for name and phone
- Email section with inline change form (password + new email + confirm)
- Password section with change or set password form depending on auth method
- Toast notifications on success/error
- Info banner after email change: "Confirmation link sent to [new_email]. Check your inbox."

## Error Handling & Edge Cases

- **Inline field-level errors** for validation failures
- **Email already in use:** Backend checks before initiating change
- **OAuth user + no password + email change:** UI prevents — button disabled with tooltip
- **Pending email change:** Backend rejects duplicate requests with clear message
- **Stale "wasn't me" token:** Stateless check — if password changed after `issued_at`, show "Your account has already been secured"
- **Session expiry during edit:** Auth interceptor catches 401, redirects to login
- **Concurrent edits:** Last write wins for name/phone; Supabase handles email/password atomically
- **Loading states:** Save buttons show spinner and disable during API calls
