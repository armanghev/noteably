import { useQuery } from '@tanstack/react-query';
import { contentService } from '@/lib/api/services/content';

export const contentKeys = {
  detail: (jobId: string) => ['content', jobId] as const,
};

export function useJobContent(jobId: string | undefined) {
  return useQuery({
    queryKey: contentKeys.detail(jobId!),
    queryFn: () => contentService.getJobContent(jobId!),
    enabled: !!jobId,
  });
}
