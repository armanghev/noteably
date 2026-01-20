import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsService, type ProcessUploadParams, type DashboardData } from '@/lib/api/services/jobs';
import type { JobListItem } from '@/types';

export const jobKeys = {
  all: ['jobs'] as const,
  limited: (limit: number) => ['jobs', 'limited', limit] as const,
  detail: (id: string) => ['jobs', id] as const,
  dashboard: ['dashboard'] as const,
};

export type { JobListItem, DashboardData };

export function useJob(jobId: string | undefined, options?: { stopPollingWhenComplete?: boolean }) {
  const { stopPollingWhenComplete = true } = options || {};
  
  return useQuery({
    queryKey: jobKeys.detail(jobId!),
    queryFn: () => jobsService.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // If polling is disabled via options, don't poll
      if (!stopPollingWhenComplete) {
        return false;
      }
      
      // Get the latest data from the query state
      const data = query.state.data;
      
      // If no data yet, continue polling
      if (!data) {
        return 2000;
      }
      
      // Stop polling if job is completed or failed
      const status = data.status;
      if (status === 'completed' || status === 'failed') {
        return false;
      }
      
      // Continue polling every 2 seconds for active jobs (queued, transcribing, generating)
      return 2000;
    },
  });
}

export function useJobs() {
  return useQuery({
    queryKey: jobKeys.all,
    queryFn: () => jobsService.listJobs(),
  });
}

export function useRecentJobs(limit: number = 10) {
  return useQuery({
    queryKey: jobKeys.limited(limit),
    queryFn: () => jobsService.listJobs(limit),
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: jobKeys.dashboard,
    queryFn: jobsService.getDashboardData,
  });
}

export function useProcessUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: ProcessUploadParams) => jobsService.processUpload(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}
