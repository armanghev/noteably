# Signup Flow Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add OAuth-first signup (Google + Apple placeholder) with profile completion step across web and iOS, storing profile data in Supabase `user_metadata`.

**Architecture:** Client-side Supabase OAuth on both platforms. After any signup method, users complete a profile form (first name, last name, phone). A new backend endpoint `POST /api/auth/complete-profile` writes fields to `user_metadata` using the admin API. The `profile_completed` flag gates access to the main app.

**Tech Stack:** Django REST Framework, Supabase Auth (admin SDK), React/Vite + Tailwind + Radix UI, SwiftUI + Supabase Swift SDK

---

## Task 1: Backend — Add `complete-profile` endpoint

**Files:**
- Modify: `backend/apps/accounts/views.py`
- Modify: `backend/apps/accounts/urls.py`
- Modify: `backend/apps/accounts/middleware.py` (add `/api/auth/complete-profile` to exempt paths — NOT needed, it requires auth)

**Step 1: Add the `complete_profile` view to `backend/apps/accounts/views.py`**

Add after the `login` view (after line 105):

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_profile(request):
    """
    Complete user profile by updating Supabase user_metadata.
    Called after signup (email or OAuth) to set first/last name and optional phone.
    """
    first_name = request.data.get("first_name", "").strip()
    last_name = request.data.get("last_name", "").strip()
    phone_number = request.data.get("phone_number", "").strip() or None

    if not first_name or not last_name:
        return Response(
            {"error": "First name and last name are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        response = supabase_client.client.auth.admin.update_user_by_id(
            request.user_id,
            {
                "user_metadata": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone_number": phone_number,
                    "profile_completed": True,
                }
            },
        )

        if not response.user:
            return Response(
                {"error": "Failed to update profile"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Profile completed successfully",
                "user": response.user.model_dump(),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Profile completion failed for {request.user_id}: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
```

**Step 2: Add URL route in `backend/apps/accounts/urls.py`**

Add after the login path (after line 9):

```python
path("complete-profile", views.complete_profile, name="complete_profile"),
```

**Step 3: Update `get_user_profile` view to include profile fields**

Replace the existing `get_user_profile` view in `backend/apps/accounts/views.py` (lines 108-117) with:

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """
    Get current user's profile information.
    Includes profile fields from user_metadata.
    """
    user_metadata = {}
    if hasattr(request.user, 'data') and isinstance(request.user.data, dict):
        user_metadata = request.user.data.get("user_metadata", {}) or {}

    return Response({
        "user": request.user,
        "user_id": request.user_id,
        "first_name": user_metadata.get("first_name"),
        "last_name": user_metadata.get("last_name"),
        "phone_number": user_metadata.get("phone_number"),
        "profile_completed": user_metadata.get("profile_completed", False),
    })
```

**Step 4: Commit**

```bash
git add backend/apps/accounts/views.py backend/apps/accounts/urls.py
git commit -m "feat: add complete-profile endpoint and enrich user profile response"
```

---

## Task 2: Web Frontend — Types and API service

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api/services/auth.ts`
- Modify: `frontend/src/lib/constants/index.ts`
- Modify: `frontend/src/router/routes.ts`

**Step 1: Add `CompleteProfileRequest` type to `frontend/src/types/index.ts`**

Add after the `RegisterRequest` interface (after line 24):

```typescript
export interface CompleteProfileRequest {
  first_name: string;
  last_name: string;
  phone_number?: string;
}
```

**Step 2: Add `completeProfile` and `signInWithGoogle` to `frontend/src/lib/api/services/auth.ts`**

Add to the `authService` object (before the closing `};`):

```typescript
  completeProfile: async (data: CompleteProfileRequest): Promise<void> => {
    await apiClient.post("/auth/complete-profile", data);
  },

  signInWithGoogle: async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/complete-profile`,
      },
    });
    if (error) throw { message: error.message, status: 400 };
  },
```

Also add the import at the top of the file:

```typescript
import type { LoginRequest, RegisterRequest, CompleteProfileRequest } from "@/types";
```

**Step 3: Add COMPLETE_PROFILE to constants**

In `frontend/src/lib/constants/index.ts`, add to `API_ENDPOINTS.AUTH`:

```typescript
COMPLETE_PROFILE: '/auth/complete-profile',
```

**Step 4: Add COMPLETE_PROFILE route**

In `frontend/src/router/routes.ts`, add to the `ROUTES` object:

```typescript
COMPLETE_PROFILE: "/complete-profile",
```

**Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api/services/auth.ts frontend/src/lib/constants/index.ts frontend/src/router/routes.ts
git commit -m "feat: add types, API service, and route constants for profile completion"
```

---

## Task 3: Web Frontend — Redesign Signup page

**Files:**
- Modify: `frontend/src/pages/Signup.tsx`

**Step 1: Rewrite `Signup.tsx` with OAuth-first design**

Replace the entire file with:

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { authService } from "@/lib/api/services/auth";
import type { ApiError } from "@/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEmailForm, setIsEmailForm] = useState(false);
  const { register, loading } = useAuth();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    try {
      setGoogleLoading(true);
      await authService.signInWithGoogle();
      // OAuth will redirect — this code won't execute
    } catch (error) {
      setGoogleLoading(false);
      if (error && typeof error === "object" && "message" in error) {
        handleError(error as ApiError);
      }
    }
  };

  const handleAppleSignUp = () => {
    handleError({ message: "Apple Sign-In is coming soon!" });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      handleError({ message: "Passwords do not match" });
      return;
    }
    try {
      await register({ email, password });
      navigate("/complete-profile", { replace: true });
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        handleError(error as ApiError);
      } else {
        handleError(new Error(String(error)));
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md rounded-3xl shadow-xl p-8 md:p-12 relative">
        <Link
          to="/"
          className="absolute top-8 left-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>

        <div className="text-center mb-10 mt-4">
          <h1 className="text-3xl font-serif text-foreground mb-3">
            Create an account
          </h1>
          <p className="text-muted-foreground">
            Get started with Noteably today.
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full py-6 rounded-xl font-medium flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleAppleSignUp}
            disabled={loading}
            className="w-full py-6 rounded-xl font-medium flex items-center justify-center gap-3 opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
            <span className="text-xs text-muted-foreground">(Coming soon)</span>
          </Button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-4 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Email/Password Form */}
        {!isEmailForm ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsEmailForm(true)}
            className="w-full py-6 rounded-xl font-medium text-muted-foreground hover:text-foreground"
          >
            Sign up with email
          </Button>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                placeholder="student@university.edu"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>
        )}

        <p className="text-center mt-8 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/Signup.tsx
git commit -m "feat: redesign signup page with OAuth-first flow"
```

---

## Task 4: Web Frontend — CompleteProfile page and routing

**Files:**
- Create: `frontend/src/pages/CompleteProfile.tsx`
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/contexts/AuthContext.tsx`

**Step 1: Create `frontend/src/pages/CompleteProfile.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { authService } from "@/lib/api/services/auth";
import type { ApiError } from "@/types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CompleteProfile() {
  const { user, refreshUser } = useAuth();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill from OAuth user_metadata (Google provides given_name / family_name / full_name)
  useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata;
      if (meta.given_name && !firstName) setFirstName(meta.given_name as string);
      if (meta.family_name && !lastName) setLastName(meta.family_name as string);
      // Also try full_name as fallback
      if (!meta.given_name && meta.full_name && !firstName) {
        const parts = (meta.full_name as string).split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
      // If profile is already completed, redirect to dashboard
      if (meta.profile_completed) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      handleError({ message: "First name and last name are required" });
      return;
    }
    try {
      setLoading(true);
      await authService.completeProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || undefined,
      });
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        handleError(error as ApiError);
      } else {
        handleError(new Error(String(error)));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md rounded-3xl shadow-xl p-8 md:p-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif text-foreground mb-3">
            Complete your profile
          </h1>
          <p className="text-muted-foreground">
            Just a few more details to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="firstName">
                First name *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                placeholder="John"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="lastName">
                Last name *
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                placeholder="Doe"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="phone">
              Phone number <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              placeholder="+1 (555) 123-4567"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !firstName.trim() || !lastName.trim()}
            className="w-full py-6 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

**Step 2: Update router — `frontend/src/router/index.tsx`**

Add import at the top (after line 16, the Signup import):

```typescript
import CompleteProfile from "@/pages/CompleteProfile";
```

Add the route inside the protected routes children array (after the Profile route, around line 62):

```typescript
      {
        path: ROUTES.COMPLETE_PROFILE,
        element: <CompleteProfile />,
      },
```

**Step 3: Update AuthContext to add `signInWithGoogle` and `profileCompleted` state**

In `frontend/src/contexts/AuthContext.tsx`:

1. Add to the `AuthContextType` interface:

```typescript
    signInWithGoogle: () => Promise<void>;
    profileCompleted: boolean;
```

2. Add `signInWithGoogle` function in the `AuthProvider`:

```typescript
    const signInWithGoogle = async () => {
        try {
            setLoading(true);
            setError(null);
            await authService.signInWithGoogle();
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError);
            throw apiError;
        } finally {
            setLoading(false);
        }
    };
```

3. Add `profileCompleted` computed value:

```typescript
    const profileCompleted = !!user?.user_metadata?.profile_completed;
```

4. Add both to the provider value object:

```typescript
                signInWithGoogle,
                profileCompleted,
```

**Step 4: Commit**

```bash
git add frontend/src/pages/CompleteProfile.tsx frontend/src/router/index.tsx frontend/src/contexts/AuthContext.tsx
git commit -m "feat: add CompleteProfile page with OAuth prefill and routing"
```

---

## Task 5: Web Frontend — Profile completion redirect logic

**Files:**
- Modify: `frontend/src/router/ProtectedRoute.tsx`

**Step 1: Add profile completion redirect to `ProtectedRoute.tsx`**

Replace the file content with:

```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, loading, profileCompleted } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen p-6">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Redirect to profile completion if profile is not completed
    // (but don't redirect if we're already on the complete-profile page)
    if (!profileCompleted && location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }

    return <>{children}</>;
}
```

**Step 2: Commit**

```bash
git add frontend/src/router/ProtectedRoute.tsx
git commit -m "feat: add profile completion redirect to protected routes"
```

---

## Task 6: iOS — Add `completeProfile` and `signInWithGoogle` to AuthService

**Files:**
- Modify: `Noteably/Noteably/Services/AuthService.swift`
- Modify: `Noteably/Noteably/Models/User.swift`

**Step 1: Add `CompleteProfileRequest` model**

In `Noteably/Noteably/Models/User.swift`, add after the `AuthSession` struct (after line 38):

```swift
// MARK: - Complete Profile

struct CompleteProfileRequest: Codable {
    let firstName: String
    let lastName: String
    let phoneNumber: String?

    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
    }
}

struct CompleteProfileResponse: Codable {
    let message: String
    let user: AuthUser?
}
```

**Step 2: Add `completeProfile` and `signInWithGoogle` to AuthService**

In `Noteably/Noteably/Services/AuthService.swift`, add after the `signUp` method (after line 75):

```swift
    // MARK: - Complete Profile

    func completeProfile(firstName: String, lastName: String, phoneNumber: String? = nil) async throws {
        let body = CompleteProfileRequest(
            firstName: firstName,
            lastName: lastName,
            phoneNumber: phoneNumber
        )
        let _: CompleteProfileResponse = try await api.post(
            path: "/api/auth/complete-profile",
            body: body
        )

        // Refresh the session to pick up updated user_metadata
        try await supabase.auth.refreshSession()
        if let session = try? await supabase.auth.session {
            applySession(session)
        }
    }

    // MARK: - Google OAuth

    func signInWithGoogle() async throws {
        let url = try await supabase.auth.getOAuthSignInURL(
            provider: .google,
            redirectTo: URL(string: "noteably://auth/callback")
        )

        // Open the URL in the system browser
        await MainActor.run {
            UIApplication.shared.open(url)
        }
    }
```

**Step 3: Update `applySession` to extract profile fields**

In `AuthService.swift`, add new properties after `currentAvatarUrl` (after line 15):

```swift
    private(set) var currentFirstName: String?
    private(set) var currentLastName: String?
    private(set) var profileCompleted: Bool = false
```

Update the `applySession` method to extract profile fields. Replace lines 126-136 with:

```swift
    private func applySession(_ session: Session) {
        currentUserId = session.user.id.uuidString.lowercased()
        currentEmail = session.user.email
        if let avatarUrl = session.user.userMetadata["avatar_url"]?.stringValue {
            currentAvatarUrl = avatarUrl
        } else {
            currentAvatarUrl = nil
        }
        currentFirstName = session.user.userMetadata["first_name"]?.stringValue
        currentLastName = session.user.userMetadata["last_name"]?.stringValue
        profileCompleted = session.user.userMetadata["profile_completed"]?.boolValue ?? false
        isAuthenticated = true
    }
```

Update the `clearSession` method to clear profile fields. Replace lines 138-143 with:

```swift
    private func clearSession() {
        currentUserId = nil
        currentEmail = nil
        currentAvatarUrl = nil
        currentFirstName = nil
        currentLastName = nil
        profileCompleted = false
        isAuthenticated = false
    }
```

**Step 4: Commit**

```bash
git add Noteably/Noteably/Services/AuthService.swift Noteably/Noteably/Models/User.swift
git commit -m "feat(ios): add completeProfile, signInWithGoogle, and profile fields to AuthService"
```

---

## Task 7: iOS — Update AppState with profile completion flow

**Files:**
- Modify: `Noteably/Noteably/App/AppState.swift`

**Step 1: Add profile state and methods**

Replace the entire `AppState.swift` with:

```swift
import SwiftUI
import Network

// MARK: - App State

@Observable
final class AppState {
    var isAuthenticated = false
    var userId: String?
    var needsProfileCompletion = false
    var isConnected = true

    private let authService = AuthService.shared
    private let networkMonitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.noteably.network")

    init() {
        setupNetworkMonitoring()
        setupAPIClient()
        syncAuthState()
        listenToAuthChanges()
    }

    // MARK: - Auth

    func syncAuthState() {
        isAuthenticated = authService.isAuthenticated
        userId = authService.currentUserId
        needsProfileCompletion = isAuthenticated && !authService.profileCompleted
    }

    func signIn(email: String, password: String) async throws {
        try await authService.signIn(email: email, password: password)
        syncAuthState()
    }

    func signUp(email: String, password: String) async throws {
        try await authService.signUp(email: email, password: password)
        syncAuthState()
    }

    func signInWithGoogle() async throws {
        try await authService.signInWithGoogle()
    }

    func completeProfile(firstName: String, lastName: String, phoneNumber: String? = nil) async throws {
        try await authService.completeProfile(firstName: firstName, lastName: lastName, phoneNumber: phoneNumber)
        syncAuthState()
    }

    func signOut() {
        Task {
            await authService.signOut()
            await MainActor.run { syncAuthState() }
        }
    }

    private func listenToAuthChanges() {
        authService.listenToAuthChanges { [weak self] isAuth in
            self?.isAuthenticated = isAuth
            if isAuth {
                self?.userId = self?.authService.currentUserId
                self?.needsProfileCompletion = !(self?.authService.profileCompleted ?? false)
            } else {
                self?.userId = nil
                self?.needsProfileCompletion = false
            }
        }
    }

    // MARK: - Network

    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
            }
        }
        networkMonitor.start(queue: monitorQueue)
    }

    // MARK: - API Client Setup

    private func setupAPIClient() {
        APIClient.shared.baseURL = "http://10.162.133.186:8000"
        APIClient.shared.tokenProvider = { [weak self] in
            guard self != nil else { return nil }
            return await AuthService.shared.getAccessToken()
        }
    }
}
```

**Step 2: Commit**

```bash
git add Noteably/Noteably/App/AppState.swift
git commit -m "feat(ios): add profile completion state and Google OAuth to AppState"
```

---

## Task 8: iOS — Create CompleteProfileView

**Files:**
- Create: `Noteably/Noteably/Views/Auth/CompleteProfileView.swift`

**Step 1: Create `CompleteProfileView.swift`**

```swift
import SwiftUI

struct CompleteProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @Environment(AuthService.self) private var authService

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phoneNumber = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var appeared = false

    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case firstName, lastName, phone
    }

    var body: some View {
        ZStack {
            Color.noteablyBackground
                .ignoresSafeArea()
                .onTapGesture { focusedField = nil }

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    Spacer()
                        .frame(height: 60)

                    formCard
                        .padding(.horizontal, 24)

                    Spacer()
                }
                .padding(.top, 8)
            }
        }
        .onAppear {
            prefillFromOAuth()
            withAnimation(.easeOut(duration: 0.6)) {
                appeared = true
            }
        }
    }

    // MARK: - Form Card

    private var formCard: some View {
        VStack(spacing: 28) {
            VStack(spacing: 10) {
                Text("Complete your profile")
                    .font(.noteablySerif(32, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                Text("Just a few more details to get started.")
                    .font(.noteablyBody(16))
                    .foregroundStyle(Color.noteablySecondaryText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let errorMessage {
                HStack(spacing: 10) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundStyle(Color.noteablyDestructive)
                    Text(errorMessage)
                        .font(.noteablyBody(14))
                        .foregroundStyle(Color.noteablyDestructive)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.noteablyDestructive.opacity(0.08))
                )
            }

            VStack(spacing: 18) {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("First name")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        TextField("John", text: $firstName)
                            .textContentType(.givenName)
                            .textInputAutocapitalization(.words)
                            .focused($focusedField, equals: .firstName)
                            .noteablyTextField(isFocused: focusedField == .firstName)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .lastName }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Last name")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        TextField("Doe", text: $lastName)
                            .textContentType(.familyName)
                            .textInputAutocapitalization(.words)
                            .focused($focusedField, equals: .lastName)
                            .noteablyTextField(isFocused: focusedField == .lastName)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .phone }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Phone number")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)
                        Text("(optional)")
                            .font(.noteablyBody(13))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }

                    TextField("+1 (555) 123-4567", text: $phoneNumber)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                        .focused($focusedField, equals: .phone)
                        .noteablyTextField(isFocused: focusedField == .phone)
                }
            }

            Button(action: completeProfile) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Continue")
                }
            }
            .buttonStyle(NoteablyPrimaryButtonStyle())
            .disabled(isLoading || !isFormValid)
            .opacity(isFormValid ? 1.0 : 0.6)
        }
        .padding(28)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.noteablyCard)
                .shadow(color: Color.black.opacity(0.06), radius: 24, x: 0, y: 8)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.3), lineWidth: 1)
        )
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
    }

    // MARK: - Validation

    private var isFormValid: Bool {
        !firstName.trimmingCharacters(in: .whitespaces).isEmpty &&
        !lastName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Prefill

    private func prefillFromOAuth() {
        if let first = authService.currentFirstName, !first.isEmpty {
            firstName = first
        }
        if let last = authService.currentLastName, !last.isEmpty {
            lastName = last
        }
    }

    // MARK: - Actions

    private func completeProfile() {
        guard isFormValid else { return }
        focusedField = nil
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await appState.completeProfile(
                    firstName: firstName.trimmingCharacters(in: .whitespaces),
                    lastName: lastName.trimmingCharacters(in: .whitespaces),
                    phoneNumber: phoneNumber.trimmingCharacters(in: .whitespaces).isEmpty
                        ? nil
                        : phoneNumber.trimmingCharacters(in: .whitespaces)
                )
                dismiss()
            } catch let error as APIError {
                errorMessage = error.errorDescription
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

#Preview {
    CompleteProfileView()
        .environment(AppState())
        .environment(AuthService.shared)
}
```

**Step 2: Commit**

```bash
git add Noteably/Noteably/Views/Auth/CompleteProfileView.swift
git commit -m "feat(ios): create CompleteProfileView with OAuth prefill"
```

---

## Task 9: iOS — Redesign SignUpView with OAuth buttons

**Files:**
- Modify: `Noteably/Noteably/Views/Auth/SignUpView.swift`

**Step 1: Rewrite `SignUpView.swift` with OAuth-first layout**

Replace the entire file with:

```swift
import SwiftUI

struct SignUpView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    var switchToSignIn: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var isGoogleLoading = false
    @State private var showEmailForm = false
    @State private var errorMessage: String?
    @State private var appeared = false
    @State private var showCompleteProfile = false

    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case email, password, confirmPassword
    }

    var body: some View {
        ZStack {
            Color.noteablyBackground
                .ignoresSafeArea()
                .onTapGesture { focusedField = nil }

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    header
                        .padding(.top, 16)
                        .padding(.bottom, 48)

                    formCard
                        .padding(.horizontal, 24)

                    footer
                        .padding(.top, 32)

                    Spacer()
                }
                .padding(.top, 8)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) {
                appeared = true
            }
        }
        .fullScreenCover(isPresented: $showCompleteProfile) {
            CompleteProfileView()
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "arrow.left")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(Color.noteablyForeground)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle()
                            .fill(Color.noteablyCard)
                            .shadow(color: Color.black.opacity(0.04), radius: 8, y: 2)
                    )
            }
            Spacer()
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Form Card

    private var formCard: some View {
        VStack(spacing: 28) {
            VStack(spacing: 10) {
                Text("Create an account")
                    .font(.noteablySerif(32, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                Text("Get started with Noteably today.")
                    .font(.noteablyBody(16))
                    .foregroundStyle(Color.noteablySecondaryText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let errorMessage {
                HStack(spacing: 10) {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundStyle(Color.noteablyDestructive)
                    Text(errorMessage)
                        .font(.noteablyBody(14))
                        .foregroundStyle(Color.noteablyDestructive)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.noteablyDestructive.opacity(0.08))
                )
            }

            // OAuth Buttons
            VStack(spacing: 12) {
                Button(action: signInWithGoogle) {
                    HStack(spacing: 12) {
                        if isGoogleLoading {
                            ProgressView()
                                .tint(Color.noteablyForeground)
                        } else {
                            Image("google-logo")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 20, height: 20)
                        }
                        Text("Continue with Google")
                            .font(.noteablyBody(16, weight: .medium))
                    }
                    .foregroundStyle(Color.noteablyForeground)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.noteablyBorder, lineWidth: 1)
                    )
                }
                .disabled(isGoogleLoading || isLoading)

                Button(action: signInWithApple) {
                    HStack(spacing: 12) {
                        Image(systemName: "apple.logo")
                            .font(.system(size: 18))
                        Text("Continue with Apple")
                            .font(.noteablyBody(16, weight: .medium))
                        Text("(Coming soon)")
                            .font(.noteablyBody(13))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                    .foregroundStyle(Color.noteablyForeground)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.noteablyBorder, lineWidth: 1)
                    )
                    .opacity(0.6)
                }
            }

            // Divider
            HStack {
                Rectangle()
                    .fill(Color.noteablyBorder)
                    .frame(height: 1)
                Text("or")
                    .font(.noteablyBody(14))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .padding(.horizontal, 16)
                Rectangle()
                    .fill(Color.noteablyBorder)
                    .frame(height: 1)
            }

            // Email form toggle or form
            if !showEmailForm {
                Button {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showEmailForm = true
                    }
                } label: {
                    Text("Sign up with email")
                        .font(.noteablyBody(16, weight: .medium))
                        .foregroundStyle(Color.noteablySecondaryText)
                }
            } else {
                VStack(spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Email")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        TextField("student@university.edu", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .email)
                            .noteablyTextField(isFocused: focusedField == .email)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .password }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Password")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        SecureField("••••••••", text: $password)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .password)
                            .noteablyTextField(isFocused: focusedField == .password)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .confirmPassword }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Confirm Password")
                            .font(.noteablyBody(14, weight: .medium))
                            .foregroundStyle(Color.noteablyForeground)

                        SecureField("••••••••", text: $confirmPassword)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .confirmPassword)
                            .noteablyTextField(isFocused: focusedField == .confirmPassword)
                            .submitLabel(.go)
                            .onSubmit { signUp() }
                    }

                    if !password.isEmpty && password.count < 6 {
                        HStack(spacing: 6) {
                            Image(systemName: "info.circle")
                                .font(.system(size: 13))
                            Text("Password must be at least 6 characters")
                                .font(.noteablyBody(13))
                        }
                        .foregroundStyle(Color.noteablySecondaryText)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))

                Button(action: signUp) {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Sign Up")
                    }
                }
                .buttonStyle(NoteablyPrimaryButtonStyle())
                .disabled(isLoading || !isFormValid)
                .opacity(isFormValid ? 1.0 : 0.6)
            }
        }
        .padding(28)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.noteablyCard)
                .shadow(color: Color.black.opacity(0.06), radius: 24, x: 0, y: 8)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.3), lineWidth: 1)
        )
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
    }

    // MARK: - Footer

    private var footer: some View {
        HStack(spacing: 4) {
            Text("Already have an account?")
                .font(.noteablyBody(15))
                .foregroundStyle(Color.noteablySecondaryText)

            Button {
                switchToSignIn()
            } label: {
                Text("Sign in")
                    .font(.noteablyBody(15, weight: .semibold))
                    .foregroundStyle(Color.noteablyPrimary)
            }
        }
        .opacity(appeared ? 1 : 0)
    }

    // MARK: - Validation

    private var isFormValid: Bool {
        !email.isEmpty && password.count >= 6 && password == confirmPassword
    }

    // MARK: - Actions

    private func signUp() {
        guard isFormValid else { return }

        if password != confirmPassword {
            errorMessage = "Passwords don't match."
            return
        }

        focusedField = nil
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await appState.signUp(email: email, password: password)
                showCompleteProfile = true
            } catch let error as APIError {
                errorMessage = error.errorDescription
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func signInWithGoogle() {
        isGoogleLoading = true
        errorMessage = nil

        Task {
            do {
                try await appState.signInWithGoogle()
            } catch let error as APIError {
                errorMessage = error.errorDescription
            } catch {
                errorMessage = error.localizedDescription
            }
            isGoogleLoading = false
        }
    }

    private func signInWithApple() {
        errorMessage = "Apple Sign-In is coming soon!"
    }
}

#Preview {
    SignUpView(switchToSignIn: {})
        .environment(AppState())
        .environment(AuthService.shared)
}
```

**Step 2: Commit**

```bash
git add Noteably/Noteably/Views/Auth/SignUpView.swift
git commit -m "feat(ios): redesign SignUpView with OAuth-first flow"
```

---

## Task 10: iOS — Update NoteablyApp root view for profile completion gate

**Files:**
- Modify: `Noteably/Noteably/NoteablyApp.swift`

**Step 1: Update the root view to handle profile completion state**

Replace the entire file with:

```swift
import SwiftUI

@main
struct NoteablyApp: App {
    @State private var appState = AppState()
    @State private var authService = AuthService.shared

    var body: some Scene {
        WindowGroup {
            Group {
                if appState.isAuthenticated {
                    if appState.needsProfileCompletion {
                        CompleteProfileView()
                    } else {
                        MainTabView()
                    }
                } else {
                    OnboardingView()
                }
            }
            .environment(appState)
            .environment(authService)
            .animation(.easeInOut(duration: 0.3), value: appState.isAuthenticated)
            .animation(.easeInOut(duration: 0.3), value: appState.needsProfileCompletion)
        }
    }
}
```

**Step 2: Commit**

```bash
git add Noteably/Noteably/NoteablyApp.swift
git commit -m "feat(ios): gate main app behind profile completion check"
```

---

## Task 11: Verify and final commit

**Step 1: Run frontend lint**

```bash
cd frontend && npm run lint
```

Fix any lint errors that arise.

**Step 2: Run frontend build**

```bash
cd frontend && npm run build
```

Fix any type errors.

**Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: address lint and type errors from signup flow implementation"
```
