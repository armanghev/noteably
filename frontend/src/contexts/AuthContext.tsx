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
  signInWithGoogle: () => Promise<void>;
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Fetch latest user metadata in the background (JWT may have stale data)
      // This runs outside the auth lock so it's safe
      if (session?.user) {
        supabase.auth.getUser().then(({ data: { user: freshUser } }) => {
          if (freshUser) setUser(freshUser);
        });
      }
    });

    // Listen for auth changes — keep synchronous to avoid Supabase auth lock deadlocks
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
