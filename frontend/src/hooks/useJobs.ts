import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsService, type ProcessUploadParams } from '@/lib/api/services/jobs';

export const jobKeys = {
  all: ['jobs'] as const,
  detail: (id: string) => ['jobs', id] as const,
};

export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: jobKeys.detail(jobId!),
    queryFn: () => jobsService.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (data) => 
      data?.status === 'completed' || data?.status === 'failed' ? false : 2000,
  });
}

export function useJobs() {
  return useQuery({
    queryKey: jobKeys.all,
    queryFn: jobsService.listJobs,
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
