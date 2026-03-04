export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const API_ENDPOINTS = {
  AUTH: {
    // Note: Supabase handles login/register/logout on frontend
    // Backend endpoints for authenticated user data
    CURRENT_USER: "/auth/me",
    DELETE_ACCOUNT: "/auth/me/delete",
    SUBSCRIPTION: "/auth/subscription",
    COMPLETE_PROFILE: "/auth/complete-profile",
    UPDATE_PROFILE: "/auth/me/update",
    REQUEST_EMAIL_CHANGE: "/auth/me/request-email-change",
    CONFIRM_EMAIL_CHANGE: "/auth/confirm-email-change",
    CHANGE_PASSWORD: "/auth/me/change-password",
    SET_PASSWORD: "/auth/me/set-password",
  },
  JOBS: {
    PROCESS: "/process",
    LIST: "/jobs/",
    DETAIL: (id: string) => `/jobs/${id}/`,
  },
  CONTENT: {
    DETAIL: (jobId: string) => `/content/${jobId}/`,
  },
  NOTES: {
    LIST: "/notes/",
    DETAIL: (id: string | number) => `/notes/${id}/`,
  },
  FLASHCARDS: {
    LIST: "/flashcards/",
    DETAIL: (id: string | number) => `/flashcards/${id}/`,
  },
  QUIZZES: {
    LIST: "/quizzes/",
    DETAIL: (id: string | number) => `/quizzes/${id}/`,
  },
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user",
} as const;
