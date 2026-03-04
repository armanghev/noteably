// API response types

import type { Job, JobStatus, MaterialType } from './models';

// Process upload response
export interface ProcessUploadResponse {
  job_id: string;
  status: JobStatus;
  estimated_time: number;
}

// Job status response (matches JobSerializer)
export interface JobResponse extends Job {}

// Content response from /api/content/{job_id}/
export interface ContentResponse {
  job_id: string;
  status: JobStatus;
  content: Record<MaterialType, unknown>;
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Export request and response types
export interface ExportRequest {
  job_id: string;
  format: 'markdown' | 'json' | 'pdf';
  material_types?: MaterialType[];
  options?: {
    include_transcript?: boolean;
    include_metadata?: boolean;
  };
}

export interface ExportResponse {
  download_url: string;
  file_name: string;
  file_size: number;
  expires_at: string;
}
