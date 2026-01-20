import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizService, type QuizAttempt, type CreateQuizAttemptRequest } from '@/lib/api/services/quiz';

export const quizAttemptKeys = {
  all: ['quiz-attempts'] as const,
  byJob: (jobId: string) => ['quiz-attempts', jobId] as const,
};

export function useQuizAttempts(jobId: string | undefined) {
  return useQuery({
    queryKey: quizAttemptKeys.byJob(jobId!),
    queryFn: () => quizService.getAttempts(jobId!),
    enabled: !!jobId,
  });
}

export function useQuizAttemptsForJobs(jobIds: string[]) {
  return useQueries({
    queries: jobIds.map((jobId) => ({
      queryKey: quizAttemptKeys.byJob(jobId),
      queryFn: () => quizService.getAttempts(jobId),
      enabled: !!jobId,
    })),
  });
}

export function useCreateQuizAttempt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: CreateQuizAttemptRequest }) =>
      quizService.createAttempt(jobId, data),
    onSuccess: (_, variables) => {
      // Invalidate the attempts list for this job
      queryClient.invalidateQueries({ queryKey: quizAttemptKeys.byJob(variables.jobId) });
    },
  });
}

export type { QuizAttempt, CreateQuizAttemptRequest };
