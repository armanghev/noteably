// Re-export all types from specialized modules
export * from "./api";
export * from "./components";
export * from "./models";

// Common API types
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

// Auth request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
  password_confirm?: string;
}

export interface CompleteProfileRequest {
  first_name: string;
  last_name: string;
  phone_number?: string;
}

// Filter types
export type DateRangeFilter = "7days" | "30days" | "90days" | "all";
export type SortOption = "newest" | "oldest" | "title-asc" | "title-desc";

import type { MaterialType } from "./models";

export interface FilterState {
  fileTypes: string[];
  contentTypes?: MaterialType[];
  dateRange: DateRangeFilter;
  sortBy: SortOption;
}

import type { CloudProvider } from "@/lib/api/services/cloud";
export interface CloudFile {
  provider: CloudProvider;
  fileId?: string;
  fileLink?: string;
  name: string;
  size?: number;
  type?: string;
}
