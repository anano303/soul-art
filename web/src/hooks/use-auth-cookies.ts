import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getUserData, 
  isLoggedIn, 
  login as loginApi, 
  register as registerApi,
  logout as logoutApi,
  checkAuthStatus 
} from "@/lib/auth-cookies";

export function useAuth() {
  const queryClient = useQueryClient();

  // Get currently logged in user data
  const {
    data: user,
    isLoading,
    error,
    status,
  } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { isAuthenticated, user } = await checkAuthStatus();
      return isAuthenticated ? user : null;
    },
    initialData: () => {
      // Only use initial data if we have stored user data
      return isLoggedIn() ? getUserData() : null;
    },
    retry: 1,
    retryDelay: 1000,
    // Set a stale time to prevent excessive refetching
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Check for updates every 30 seconds when window is focused
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return await loginApi(email, password);
    },
    onSuccess: (data) => {
      // Update the user query cache
      queryClient.setQueryData(["user"], data.user);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error) => {
      console.error("Login error:", error);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phoneNumber?: string;
    }) => {
      return await registerApi(userData);
    },
    onSuccess: (data) => {
      // Update the user query cache
      queryClient.setQueryData(["user"], data.user);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error) => {
      console.error("Registration error:", error);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // Clear all queries and reset to logged out state
      queryClient.setQueryData(["user"], null);
      queryClient.clear();
      
      // Redirect to home page or login
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    },
    onError: (error) => {
      console.error("Logout error:", error);
      // Even if logout fails, clear local data
      queryClient.setQueryData(["user"], null);
      queryClient.clear();
    },
  });

  return {
    user: user || null,
    isLoading,
    error,
    status,
    isLoggedIn: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
}
