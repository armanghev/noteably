import apiClient from '../client';
import type { ContentResponse } from '@/types';

export const contentService = {
  getJobContent: async (jobId: string): Promise<ContentResponse> => {
    const response = await apiClient.get<ContentResponse>(`/content/${jobId}/`);
    return response.data;
  },
};
