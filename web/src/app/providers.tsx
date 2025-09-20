"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "@/lib/process-refresh";
import { useEffect } from "react";
import { checkAndRefreshAuth } from "@/lib/process-refresh";

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
  // Initialize auth when the app starts
  useEffect(() => {
    const initAuth = async () => {
      if (process.env.NODE_ENV === "development") {
        console.log("🚀 Initializing auth...");
      }
      // With HTTP-only cookies, no initialization needed

      // Check if we have tokens and potentially refresh them
      const isAuthed = await checkAndRefreshAuth();
      if (process.env.NODE_ENV === "development") {
        console.log(
          `🔒 Auth initialized, user is ${
            isAuthed ? "authenticated" : "not authenticated"
          }`
        );
      }

      // Update auth state in React Query
      if (isAuthed) {
        queryClient.invalidateQueries({ queryKey: ["user"] });
      } else {
        queryClient.setQueryData(["user"], null);
      }
    };

    initAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools />
      {children}
    </QueryClientProvider>
  );
}
