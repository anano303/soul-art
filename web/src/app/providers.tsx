"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Initialize API client with interceptors by importing it
import "@/lib/axios";

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


export function Providers({ children }: { children: React.ReactNode }) {
  // Make queryClient globally accessible for auth reset during refresh failures
  // Set up global queryClient access after hydration
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.queryClient = {
        setQueryData: (key, data) => {
          queryClient.setQueryData(key, () => data);
        },
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
