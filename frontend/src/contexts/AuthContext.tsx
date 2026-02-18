import { authService } from "@/lib/api/services/auth";
import { supabase } from "@/lib/supabase";
import type { ApiError, LoginRequest, RegisterRequest } from "@/types";
import { Session, User } from "@supabase/supabase-js";
import { createContext, useEffect, useState, type ReactNode } from "react";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: ApiError | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  profileCompleted: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Helper to check for auth conflicts and handle them
  const checkAuthConflict = async (
    session: Session | null,
  ): Promise<boolean> => {
    // Check for scheduled deletion
    if (session?.user?.user_metadata?.deleted_at) {
      await supabase.auth.signOut();
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?error=account_scheduled_deletion";
      }
      return true; // Conflict found
    }

    // Check for OAuth merge conflict (blocking OAuth if email exists)
    const isOAuthFlow = localStorage.getItem("oauth_login_flow") === "true";
    if (isOAuthFlow && session?.user) {
      const identities = session.user.identities || [];
      const hasEmailIdentity = identities.some((id) => id.provider === "email");
      const hasGoogleIdentity = identities.some(
        (id) => id.provider === "google",
      );

      if (hasEmailIdentity && hasGoogleIdentity) {
        // If we have already verified the link, we allow it.
        const isVerified =
          localStorage.getItem(`oauth_link_verified_${session.user.id}`) ===
          "true";
        if (isVerified) {
          return false;
        }

        // Otherwise, we redirect to link account page
        if (!window.location.pathname.includes("/link-account")) {
          // Do NOT sign out. We need the session to verify the password.
          // But we want to block access to other pages.
          // Since this check runs on every auth change/init, it effectively gates the app
          // if we redirect or return "true" (which prevents setting session in the caller).

          // WAIT: If we return 'true' in getSession, we set session to null.
          // If we set session to null, the user is logged out and can't use the LinkAccount page (if it requires auth).
          // LinkAccount page needs to make a request.
          // Logic change: We should set the session BUT redirect to /link-account and maybe set a "restricted" state?
          // Or we can just let the session be set, but rely on the redirect to keep them on /link-account.
          // But if they manually navigate away, component mounting might trigger this check again.

          window.location.href = "/link-account";
          // We return FALSE here so the session IS set, allowing the LinkAccount page to work.
          // But we need to ensure they can't go to other pages.
          // The checkAuthConflict is called in useEffect. If they navigate, it might not trigger immediately unless we listen to location changes.
          // Better approach: In App.tsx or a global guard, or just rely on this redirecting them back if they try to leave.
          return false;
        }
        // If we are already on link-account, let the session be set.
        return false;
      }
    }
    return false; // No conflict
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Check for conflict BEFORE setting session state to avoid flicker
      const hasConflict = await checkAuthConflict(session);
      if (hasConflict) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Fetch latest user metadata
      if (session?.user) {
        supabase.auth.getUser().then(({ data: { user: freshUser } }) => {
          if (freshUser) setUser(freshUser);
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const hasConflict = await checkAuthConflict(session);
      if (hasConflict) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Clear flag if we made it here (successful login or no conflict)
      if (session) {
        localStorage.removeItem("oauth_login_flow");
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);
      await authService.login(data);
      // onAuthStateChange sets user from JWT, but JWT may have stale metadata.
      // Fetch the latest user from server to get current avatar_url, profile_completed, etc.
      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser();
      if (freshUser) setUser(freshUser);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      setLoading(true);
      setError(null);
      await authService.register(data);
      // Session is handled by onAuthStateChange
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (redirectPath?: string) => {
    try {
      setLoading(true);
      setError(null);
      // Set flag to indicate we are starting an OAuth flow
      localStorage.setItem("oauth_login_flow", "true");
      await authService.signInWithGoogle(redirectPath);
    } catch (err) {
      localStorage.removeItem("oauth_login_flow");
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      // Session is handled by onAuthStateChange
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const refreshUser = async () => {
    // Refresh the session to get a new JWT with updated user_metadata
    await supabase.auth.refreshSession();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUser(user);
  };

  const profileCompleted = !!user?.user_metadata?.profile_completed;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        login,
        register,
        signInWithGoogle,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        profileCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
