import { createContext, useState, useEffect, type ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/api/services/auth';
import type { LoginRequest, RegisterRequest, ApiError } from '@/types';

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
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        });

        // Listen for auth changes
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
            // Session is handled by onAuthStateChange
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

    const logout = async () => {
        try {
            await authService.logout();
            // Session is handled by onAuthStateChange
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const refreshUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUser(user);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                error,
                login,
                register,
                logout,
                refreshUser,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
