"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "@/lib/process-refresh";
import { initializeAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { checkAndRefreshAuth } from '@/lib/process-refresh';
import { setupDevEnvironment } from '@/lib/dev-config';
// Try the main implementation first
import { MessengerChat } from '@/components/messenger-chat';
import { MessengerDebug } from '@/components/messenger-debug';
// Uncomment below and comment above if the main one doesn't work
// import { MessengerChatAlternative as MessengerChat } from '@/components/messenger-chat-alternative';
import { Toaster } from 'sonner';

// Declare global window property for query client access
declare global {
  interface Window {
    queryClient: QueryClient;
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
if (typeof window !== 'undefined') {
  window.queryClient = queryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Setup development-specific configuration
    if (process.env.NODE_ENV === 'development') {
      setupDevEnvironment();
    }

    // Initialize auth when the app starts
    const initAuth = async () => {
      console.log('🚀 Initializing auth...');
      initializeAuth();
      
      // Check if we have tokens and potentially refresh them
      const isAuthed = await checkAndRefreshAuth();
      console.log(`🔒 Auth initialized, user is ${isAuthed ? 'authenticated' : 'not authenticated'}`);
      
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
      <Toaster />
      <MessengerChat />
      {process.env.NODE_ENV === 'development' && <MessengerDebug />}
    </QueryClientProvider>
  );
}
