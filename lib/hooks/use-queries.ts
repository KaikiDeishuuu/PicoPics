import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiClient, createHistoryApiClient } from "../api";
import { queryKeys } from "../query-client";

// Custom hook for API client
export function useApiClient(accessToken?: string) {
  return createApiClient(accessToken);
}

// User Images Query
export function useUserImages(accessToken?: string) {
  const apiClient = createHistoryApiClient(accessToken);

  return useQuery({
    queryKey: [...queryKeys.userImages, accessToken],
    queryFn: () => apiClient.getUserHistory(),
    enabled: !!accessToken,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Upload Mutation
export function useUploadImage(accessToken?: string) {
  const queryClient = useQueryClient();
  const apiClient = useApiClient(accessToken);

  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progress: number) => void;
    }) => apiClient.uploadFile(file, onProgress),
    onSuccess: () => {
      // Invalidate and refetch user images
      queryClient.invalidateQueries({ queryKey: queryKeys.userImages });
    },
  });
}

// Delete Image Mutation
export function useDeleteImage(accessToken?: string) {
  const queryClient = useQueryClient();
  const apiClient = useApiClient(accessToken);

  return useMutation({
    mutationFn: (r2ObjectKey: string) => apiClient.deleteImage(r2ObjectKey),
    onSuccess: () => {
      // Invalidate and refetch user images
      queryClient.invalidateQueries({ queryKey: queryKeys.userImages });
    },
  });
}

// Clean Invalid Records Mutation
export function useCleanInvalidRecords(accessToken?: string) {
  const queryClient = useQueryClient();
  const apiClient = useApiClient(accessToken);

  return useMutation({
    mutationFn: () => apiClient.cleanInvalidRecords(),
    onSuccess: () => {
      // Invalidate and refetch user images
      queryClient.invalidateQueries({ queryKey: queryKeys.userImages });
    },
  });
}

// Admin Stats Query
export function useAdminStats(adminToken?: string) {
  const apiClient = useApiClient(adminToken);

  return useQuery({
    queryKey: [...queryKeys.adminStats, adminToken],
    queryFn: () => apiClient.getAdminStats(),
    enabled: !!adminToken,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Admin Users Query
export function useAdminUsers(adminToken?: string) {
  const apiClient = useApiClient(adminToken);

  return useQuery({
    queryKey: [...queryKeys.adminUsers, adminToken],
    queryFn: () => apiClient.getUsers(),
    enabled: !!adminToken,
    staleTime: 60 * 1000, // 1 minute
  });
}

// System Settings Query
export function useSystemSettings(adminToken?: string) {
  const apiClient = useApiClient(adminToken);

  return useQuery({
    queryKey: [...queryKeys.systemSettings, adminToken],
    queryFn: () => apiClient.getSystemSettings(),
    enabled: !!adminToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
