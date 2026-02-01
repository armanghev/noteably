import { API_BASE_URL } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { ApiError } from "@/types";
import axios, {
    AxiosError,
    type AxiosInstance,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from "axios";

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // Base delay in ms
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableMethods: ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"],
} as const;

// Extended request config with retry tracking
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

/**
 * Calculate exponential backoff delay
 */
const getRetryDelay = (retryCount: number, baseDelay: number): number => {
  // Exponential backoff with jitter
  const delay = baseDelay * Math.pow(2, retryCount);
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
};

/**
 * Determine if request should be retried
 */
const shouldRetryRequest = (
  error: AxiosError,
  config: ExtendedAxiosRequestConfig,
): boolean => {
  const retryCount = config._retryCount || 0;

  // Max retries exceeded
  if (retryCount >= RETRY_CONFIG.maxRetries) {
    return false;
  }

  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  // Check if status code is retryable
  if (
    !RETRY_CONFIG.retryableStatuses.includes(
      error.response.status as (typeof RETRY_CONFIG.retryableStatuses)[number],
    )
  ) {
    return false;
  }

  // Check if method is retryable (skip POST by default to avoid duplicate submissions)
  const method = config.method?.toUpperCase() || "GET";
  if (!(RETRY_CONFIG.retryableMethods as readonly string[]).includes(method)) {
    return false;
  }

  return true;
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor to add auth token from Supabase
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token && config.headers) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling and retry logic
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Allow Supabase to handle session refresh via its internal mechanisms
      // if the token is invalid, but for now we just reject
      // In a complex app, we might trigger a global logout or redirect here
      // if proper session recovery fails.
      return Promise.reject(error);
    }

    // Handle retry logic for transient errors
    if (shouldRetryRequest(error, originalRequest)) {
      const retryCount = (originalRequest._retryCount || 0) + 1;
      originalRequest._retryCount = retryCount;

      const delay = getRetryDelay(retryCount, RETRY_CONFIG.retryDelay);

      console.warn(
        `Retrying request (attempt ${retryCount}/${RETRY_CONFIG.maxRetries}): ${originalRequest.url}`,
      );

      await sleep(delay);
      return apiClient(originalRequest);
    }

    // Transform error to ApiError format
    const errorData = error.response?.data as
      | { message?: string; error?: string; errors?: Record<string, string[]> }
      | undefined;
    const apiError: ApiError = {
      message:
        errorData?.error ||
        errorData?.message ||
        error.message ||
        "An error occurred",
      errors: errorData?.errors,
      status: error.response?.status,
    };

    return Promise.reject(apiError);
  },
);

export default apiClient;
