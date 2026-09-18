"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // Per-mount instance: a module-scope QueryClient would be shared across
  // SSR requests and leak one user's cache into another's render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors. Match an explicit "HTTP 4xx" or
              // "status: 4xx" signal so we don't false-positive on any
              // digit 4 in the message.
              if (error instanceof Error && /\b(HTTP|status:?)\s*4\d{2}\b/i.test(error.message)) {
                return false;
              }
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
