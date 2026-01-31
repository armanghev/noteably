import apiClient from "@/lib/api/client";
import { supabase } from "@/lib/supabase";
import type {
    AuthResponse,
    LoginCredentials,
    RegisterCredentials,
} from "@/types/auth";

export const authService = {
  async signup(data: RegisterCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/signup", data);
    return response.data;
  },

  async login(data: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    const { session } = response.data;

    // Set the session in the Supabase client to maintain frontend state
    if (session) {
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        console.error("Error setting Supabase session:", error);
        throw error;
      }
    }

    return response.data;
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },
};
