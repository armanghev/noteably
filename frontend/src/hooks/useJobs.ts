import {
    jobsService,
    ProcessYoutubeParams,
    type DashboardData,
    type ProcessUploadParams,
} from "@/lib/api/services/jobs";
import type { JobListItem } from "@/types";
import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

export const jobKeys = {
  all: ["jobs"] as const,
  list: () => ["jobs", "list"] as const,
  infinite: () => ["jobs", "infinite"] as const,
  limited: (limit: number) => ["jobs", "limited", limit] as const,
  detail: (id: string) => ["jobs", id] as const,
  dashboard: ["dashboard"] as const,
};

export type { DashboardData, JobListItem };

export interface UseJobOptions {
  stopPollingWhenComplete?: boolean;
}

export function useJob(jobId: string | undefined, options?: UseJobOptions) {
  return useQuery({
    queryKey: jobKeys.detail(jobId!),
    queryFn: () => jobsService.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Default to true (poll until complete) if not specified
      // Use explicit false check to disable polling (as requested in consumer components)
      const shouldPoll = options?.stopPollingWhenComplete ?? true;

      if (shouldPoll === false) {
        return false;
      }

      if (
        data?.status === "completed" ||
        data?.status === "failed" ||
        data?.status === "cancelled"
      ) {
        return false;
      }
      return 1000;
    },
  });
}

export function useJobs() {
  return useQuery({
    queryKey: jobKeys.list(),
    queryFn: async () => {
      try {
        const response = await jobsService.listJobs();
        // Handle both paginated and non-paginated responses
        // If response is an array, use it directly; otherwise use response.results
        return Array.isArray(response) ? response : response.results;
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        // Return empty array on error to satisfy React Query
        return [];
      }
    },
  });
}

export function useInfiniteJobs() {
  return useInfiniteQuery({
    queryKey: jobKeys.infinite(),
    queryFn: ({ pageParam }) => jobsService.listJobs(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      // Extract cursor from the next URL
      // The URL looks like: http://api/jobs/?cursor=cD0yMDI2LTAxLTMxKzIzJTNBMDclM0EwMS4wMDAwMDArMDAlM0EwMA%3D%3D
      const url = new URL(lastPage.next);
      return url.searchParams.get("cursor") || undefined;
    },
  });
}

export function useRecentJobs(limit: number = 10) {
  return useQuery({
    queryKey: jobKeys.limited(limit),
    queryFn: async () => {
      try {
        const response = await jobsService.listJobs();
        const results = Array.isArray(response) ? response : response.results;
        return results.slice(0, limit);
      } catch (error) {
        console.error("Failed to fetch recent jobs:", error);
        return [];
      }
    },
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
    mutationFn: (params: ProcessUploadParams) =>
      jobsService.processUpload(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: jobKeys.list() });
      queryClient.invalidateQueries({ queryKey: jobKeys.infinite() });
    },
  });
}

export function useProcessYoutube() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ProcessYoutubeParams) =>
      jobsService.processYoutube(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: jobKeys.list() });
      queryClient.invalidateQueries({ queryKey: jobKeys.infinite() });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jobsService.cancelJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: jobKeys.list() });
      queryClient.invalidateQueries({ queryKey: jobKeys.infinite() });
    },
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jobsService.retryJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: jobKeys.list() });
      queryClient.invalidateQueries({ queryKey: jobKeys.infinite() });
    },
  });
}

export function useSignedFileUrl(jobId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", jobId, "signed-url"],
    queryFn: () => jobsService.getSignedFileUrl(jobId!),
    enabled: !!jobId,
    staleTime: 23 * 60 * 60 * 1000, // 23 hours (signed URLs expire in 24 hours)
    gcTime: 23 * 60 * 60 * 1000, // Keep in cache for 23 hours
  });
}
