import { useAuth } from "@/hooks/use-auth";

// This is now a wrapper around useAuth for backward compatibility
export function useUser() {
  const { user, isLoading, error } = useAuth();
  
  return { 
    user, 
    isLoading, 
    error,
    isError: !!error
  };
}
