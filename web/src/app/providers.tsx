"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { usePerformanceOptimizations } from "@/hooks/usePerformanceOptimizations";

// Declare global window property for query client access
declare global {
  interface Window {
    queryClient: {
      setQueryData: (key: unknown[], data: unknown) => void;
    };
  }
}

// Initialize the queryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Make queryClient globally accessible for auth reset during refresh failures
if (typeof window !== "undefined") {
  // Create a compatible object that satisfies the Window.queryClient type
  window.queryClient = {
    setQueryData: (key, data) => {
      // Use a type assertion to handle the compatibility issue
      queryClient.setQueryData(key, () => data);
    },
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize performance optimizations
  usePerformanceOptimizations();

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools />
      {children}
    </QueryClientProvider>
  );
}
