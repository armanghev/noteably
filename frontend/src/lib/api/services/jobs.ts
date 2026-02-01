import type {
  Job,
  JobListItem,
  MaterialType,
  ProcessUploadResponse,
} from "@/types";
import apiClient from "../client";

export interface DashboardJob {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  created_at: string;
  cached_flashcard_count: number;
}

export interface DashboardData {
  stats: {
    total_notes: number;
    total_flashcards: number;
  };
  recent_jobs: DashboardJob[];
}

export interface ProcessUploadParams {
  file: File;
  materialTypes: MaterialType[];
  options?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export const jobsService = {
  processUpload: async (
    params: ProcessUploadParams,
  ): Promise<ProcessUploadResponse> => {
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("material_types", JSON.stringify(params.materialTypes));
    if (params.options) {
      formData.append("options", JSON.stringify(params.options));
    }

    const response = await apiClient.post<ProcessUploadResponse>(
      "/process",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  getJob: async (jobId: string): Promise<Job> => {
    const response = await apiClient.get<Job>(`/jobs/${jobId}/`);
    return response.data;
  },

  listJobs: async (
    cursor?: string,
  ): Promise<PaginatedResponse<JobListItem>> => {
    const params = cursor ? { cursor } : undefined;
    const response = await apiClient.get<PaginatedResponse<JobListItem>>(
      "/jobs/",
      { params },
    );
    return response.data;
  },

  getDashboardData: async (): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>("/dashboard/");
    return response.data;
  },

  getSignedFileUrl: async (
    jobId: string,
  ): Promise<{ signed_url: string; expires_in: number }> => {
    const response = await apiClient.get<{
      signed_url: string;
      expires_in: number;
    }>(`/jobs/${jobId}/signed-url/`);
    return response.data;
  },

  cancelJob: async (
    jobId: string,
  ): Promise<{ status: string; job_id: string }> => {
    const response = await apiClient.post<{ status: string; job_id: string }>(
      `/jobs/${jobId}/cancel/`,
    );
    return response.data;
  },
};
