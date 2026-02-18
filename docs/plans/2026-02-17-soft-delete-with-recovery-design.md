# Soft Delete with 14-Day Recovery Design

**Date:** 2026-02-17
**Status:** Design Complete
**Grace Period:** 14 days
**Recovery Method:** Email link with password reset

---

## Overview

Replace hard account deletion with a soft delete model that locks the account immediately but preserves data for 14 days. Users can recover their account by clicking a link in the deletion confirmation email, setting a new password, and confirming recovery. After 14 days, a background job performs hard deletion.

**User Flow:**
1. User clicks "Delete Account" on Profile
2. Account locked immediately, deletion confirmation email sent
3. User clicks recovery link in email, sets new password
4. Account restored to active state
5. After 14 days without recovery, hard delete runs automatically

---

## Section 1: Architecture & Data Model

### Database Changes

**Deletion State Tracking:**
- Add `is_deleted` boolean flag to user metadata (Supabase) or custom table
- Add `deleted_at` timestamp (when user initiated deletion)
- Add `deletion_scheduled_at` timestamp (deleted_at + 14 days, hard delete deadline)

**States:**
- `active` - normal user, can log in
- `pending_deletion` - in 14-day grace period, account locked (no login), data preserved
- `hard_deleted` - permanently removed

### Background Job: Daily Hard Delete Task

**Celery Task:** `process_pending_deletions()`

Runs once daily, finds all users where `deleted_at < now() - 14 days` and status is `pending_deletion`.

For each expired account:
1. Delete Django models (APIKeys cascade → jobs → GeneratedContent, QuizAttempts, ChatMessages)
2. Delete Supabase Storage files (job uploads, avatar)
3. Delete user_subscriptions row from Supabase
4. Delete user from Supabase Auth (last step)
5. Log completion or failure

**Error Handling:**
- Log each step's result
- If any step fails, retry next day and alert ops
- Use transactions where possible to ensure atomicity

---

## Section 2: API Endpoints & Frontend Flow

### New/Modified Endpoints

**DELETE /api/auth/me/delete** (modified)
- User clicks "Delete Account" on Profile page
- Sets `deleted_at = now()` in user metadata
- Sends deletion confirmation email with recovery link (signed token)
- Returns 204 No Content
- Account is now locked (login prevented by middleware)

**POST /api/auth/recover** (new)
- User clicks recovery link from email
- Endpoint receives signed recovery token from URL query param
- Validates token: user_id, recovery type, expiration (14 days)
- If valid: returns short-lived recovery token (1 hour)
- Frontend redirects to password reset page with this token

**POST /api/auth/confirm-recovery** (new)
- User submits new password + recovery token
- Validates recovery token hasn't expired
- Updates password in Supabase auth
- Clears `deleted_at` flag, sets status back to `active`
- Logs recovery event (user_id, timestamp)
- Returns 200 with success message

### Frontend Flow

1. **Delete initiation:** User clicks "Delete Account" button on Profile
2. **Confirmation dialog:** Show warning, user confirms
3. **Email sent:** Backend sends deletion confirmation email
4. **Email received:** User receives email with recovery link
5. **Click link:** User clicks recovery link → lands on recovery page
6. **Password reset:** User enters new password
7. **Confirm recovery:** User clicks "Recover Account"
8. **Success:** Account restored, user redirected to login

---

## Section 3: Email & Token Security

### Deletion Confirmation Email

**Content:**
- Subject: "Your Noteably account is scheduled for deletion"
- Body includes:
  - Account will be deleted in 14 days
  - What will be deleted: study sets, files, notes, etc.
  - Recovery link with "Recover My Account" CTA
  - Days remaining countdown (nice to have)
  - Support contact info for issues

**Recovery Token:**
- Signed token using Django's `signing` module (or JWT)
- Payload:
  ```
  {
    "user_id": "uuid",
    "recovery_type": "account_deletion",
    "exp": now + 14 days
  }
  ```
- Token is tamper-proof, expiration verified server-side
- One-time use: becomes invalid after successful recovery

### Security

- Recovery link should not be reusable after account is recovered
- Token expires at 14-day mark (can't recover after grace period)
- Password reset requires new password entry (not just confirmation)
- All recovery attempts logged (success/failure) for audit trail
- Fallback for lost email: support ticket with identity verification

---

## Section 4: Testing Strategy

### Unit Tests

- Token generation, signing, validation (valid, expired, tampered)
- Deletion state transitions (active → pending_deletion → active)
- Grace period calculations (14 days from deleted_at)
- Email sending with correct recovery link

### Integration Tests

- Full recovery flow: delete → email → click link → reset password → restore
- Recovery after partial failures in background job
- Token expiration at boundaries (day 13, day 14, day 15)
- Concurrent deletion and recovery attempts (race conditions)

### Edge Cases

- User deletes account, tries to log in before recovery expires (should fail)
- User clicks recovery link after 14 days (token expired, should fail)
- User deletes account, recovers, deletes again (new 14-day window)
- User clicks recovery link multiple times (only works once)
- Hard delete job runs while user is recovering (prevent race)
- Email delivery failure (recovery link never received)

### Manual Testing

- End-to-end recovery in staging environment
- Email content and link formatting
- Token expiration at boundary (day 14)
- Locked account can't log in during grace period

---

## Implementation Order

1. **Phase 1:** Add data model (is_deleted, deleted_at, deletion_scheduled_at)
2. **Phase 2:** Modify DELETE /api/auth/me/delete to soft delete + email
3. **Phase 3:** Add POST /api/auth/recover and confirm-recovery endpoints
4. **Phase 4:** Create Celery task for hard delete after 14 days
5. **Phase 5:** Update frontend to show recovery email message
6. **Phase 6:** Add tests for all scenarios

---

## Success Criteria

- ✓ User can delete account and receive recovery email
- ✓ Account is locked immediately (can't log in)
- ✓ User can click recovery link and reset password
- ✓ Account is restored and fully functional
- ✓ After 14 days without recovery, hard delete runs
- ✓ Recovery token expires at 14-day boundary
- ✓ All edge cases handled (token reuse, concurrent ops, etc.)
- ✓ Tests pass for all scenarios
