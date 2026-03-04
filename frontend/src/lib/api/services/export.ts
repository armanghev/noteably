import apiClient from '../client';
import type { MaterialType } from '@/types';

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

export const exportService = {
  exportJob: async (params: ExportRequest): Promise<ExportResponse> => {
    const response = await apiClient.post<ExportResponse>('/export', params);
    return response.data;
  },
};
