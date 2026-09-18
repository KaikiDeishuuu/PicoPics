// Query keys for consistent caching.
// The QueryClient itself lives in components/query-provider.tsx (per-mount
// instance, created there to avoid a shared SSR cache).
export const queryKeys = {
  userImages: ["userImages"] as const,
  adminStats: ["adminStats"] as const,
  adminUsers: ["adminUsers"] as const,
  systemSettings: ["systemSettings"] as const,
  quota: ["quota"] as const,
} as const;
