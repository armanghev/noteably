import type { ContentResponse } from "@/types";
import type { AssistantMessage, AssistantRequest, AssistantResponse } from "@/types/models";
import apiClient from "../client";

export const contentService = {
  getJobContent: async (jobId: string): Promise<ContentResponse> => {
    const response = await apiClient.get<ContentResponse>(`/content/${jobId}/`);
    return response.data;
  },

  assistantChat: async (
    jobId: string,
    data: AssistantRequest,
  ): Promise<AssistantResponse> => {
    const response = await apiClient.post<AssistantResponse>(
      `/content/${jobId}/assistant/`,
      data,
    );
    return response.data;
  },

  getChatHistory: async (
    jobId: string,
  ): Promise<{ messages: AssistantMessage[] }> => {
    const response = await apiClient.get<{ messages: AssistantMessage[] }>(
      `/content/${jobId}/chat/`,
    );
    return response.data;
  },
};
