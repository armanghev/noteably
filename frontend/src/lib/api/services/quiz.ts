import apiClient from '../client';

export interface QuizAttemptAnswer {
  question_index: number;
  selected_option: number;
  is_correct: boolean;
}

export interface QuizAttempt {
  id: string;
  job: string;
  score: number;
  total_questions: number;
  percentage: number;
  answers: QuizAttemptAnswer[];
  created_at: string;
}

export interface QuizAttemptsResponse {
  results: QuizAttempt[];
}

export interface CreateQuizAttemptRequest {
  score: number;
  total_questions: number;
  answers: QuizAttemptAnswer[];
}

export const quizService = {
  createAttempt: async (jobId: string, data: CreateQuizAttemptRequest): Promise<QuizAttempt> => {
    const response = await apiClient.post<QuizAttempt>(`/quizzes/${jobId}/attempts/`, data);
    return response.data;
  },

  getAttempts: async (jobId: string): Promise<QuizAttemptsResponse> => {
    const response = await apiClient.get<QuizAttemptsResponse>(`/quizzes/${jobId}/attempts/`);
    return response.data;
  },
};
