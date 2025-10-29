import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes("4")) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  userImages: ["userImages"] as const,
  adminStats: ["adminStats"] as const,
  adminUsers: ["adminUsers"] as const,
  systemSettings: ["systemSettings"] as const,
  quota: ["quota"] as const,
} as const;
