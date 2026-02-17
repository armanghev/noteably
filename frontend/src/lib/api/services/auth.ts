import { API_ENDPOINTS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { LoginRequest, RegisterRequest, CompleteProfileRequest } from "@/types";
import apiClient from "../client";

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface AuthResponse {
  user: Record<string, unknown>;
  session: AuthSession | null;
  message?: string;
}

export const authService = {
  login: async (data: LoginRequest): Promise<void> => {
    // Call backend proxy which authenticates with Supabase
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      email: data.email,
      password: data.password,
    });

    const { session } = response.data;

    if (session) {
      // Set the session in frontend Supabase client
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        throw {
          message: error.message,
          status: error.status,
        };
      }
    }
  },

  register: async (data: RegisterRequest): Promise<void> => {
    // Call backend proxy which creates user in Supabase
    const response = await apiClient.post<AuthResponse>("/auth/signup", {
      email: data.email,
      password: data.password,
    });

    const { session } = response.data;

    // If session is returned (email confirmation disabled), set it
    if (session) {
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        throw {
          message: error.message,
          status: error.status,
        };
      }
    }
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser: async (): Promise<unknown> => {
    // Get user profile from backend (if needed for extra data)
    // The basic user data is already in the Supabase session
    const response = await apiClient.get(API_ENDPOINTS.AUTH.CURRENT_USER);
    return response.data;
  },

  completeProfile: async (data: CompleteProfileRequest): Promise<void> => {
    await apiClient.post("/auth/complete-profile", data);
  },

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.AUTH.DELETE_ACCOUNT);
  },

  signInWithGoogle: async (redirectPath = "/signup?oauth=1"): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
      },
    });
    if (error) throw { message: error.message, status: 400 };
  },
};
