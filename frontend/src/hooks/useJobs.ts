import {
  jobsService,
  type DashboardData,
  type ProcessUploadParams,
} from "@/lib/api/services/jobs";
import type { JobListItem } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const jobKeys = {
  all: ["jobs"] as const,
  limited: (limit: number) => ["jobs", "limited", limit] as const,
  detail: (id: string) => ["jobs", id] as const,
  dashboard: ["dashboard"] as const,
};

export type { DashboardData, JobListItem };

export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: jobKeys.detail(jobId!),
    queryFn: () => jobsService.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: false,
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
    mutationFn: (params: ProcessUploadParams) =>
      jobsService.processUpload(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
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
