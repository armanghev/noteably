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

export interface AccountDeletionError {
  type: 'ACCOUNT_PENDING_DELETION'
  message: string
  recoveryAvailable: boolean
  status: number
}

export const authService = {
  login: async (data: LoginRequest): Promise<void> => {
    try {
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
    } catch (error: any) {
      // Check if account is pending deletion
      if (error.response?.status === 403) {
        const errorMsg = error.response?.data?.error || ''
        if (errorMsg.includes('Account scheduled for deletion') || errorMsg.includes('pending_deletion')) {
          throw {
            type: 'ACCOUNT_PENDING_DELETION',
            message: errorMsg,
            recoveryAvailable: error.response?.data?.recovery_available ?? true,
            status: 403,
          } as AccountDeletionError
        }
      }
      throw error
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

  recoverAccount: async (token: string): Promise<any> => {
    const response = await apiClient.post("/auth/recover", null, {
      params: { token },
    });
    return response.data;
  },

  confirmRecovery: async (
    recoverySessionToken: string,
    newPassword: string
  ): Promise<any> => {
    const response = await apiClient.post("/auth/confirm-recovery", {
      recovery_session_token: recoverySessionToken,
      new_password: newPassword,
    });
    return response.data;
  },

  confirmRecoveryOAuth: async (
    recoverySessionToken: string
  ): Promise<any> => {
    const response = await apiClient.post("/auth/confirm-recovery-oauth", {
      recovery_session_token: recoverySessionToken,
    });
    return response.data;
  },
};
