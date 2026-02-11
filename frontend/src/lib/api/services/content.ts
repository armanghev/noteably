import apiClient from '../client';
import type { ContentResponse } from '@/types';
import type { AssistantRequest, AssistantResponse } from '@/types/models';

export const contentService = {
  getJobContent: async (jobId: string): Promise<ContentResponse> => {
    const response = await apiClient.get<ContentResponse>(`/content/${jobId}/`);
    return response.data;
  },

  assistantChat: async (jobId: string, data: AssistantRequest): Promise<AssistantResponse> => {
    const response = await apiClient.post<AssistantResponse>(
      `/content/${jobId}/assistant/`,
      data,
    );
    return response.data;
  },
};
