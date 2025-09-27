import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { login as loginApi, LoginData } from "@/modules/auth/api/login";
import { logout as logoutApi } from "@/modules/auth/api/logout";
import { isLoggedIn, getUserData, clearUserData } from "@/lib/auth";

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
      // If no token, don't make the request and immediately return null
      if (!isLoggedIn()) {
        return null;
      }

      try {
        const response = await apiClient.get("/auth/profile");
        return response.data;
      } catch (error) {
        console.error("Error fetching user profile:", error);

        // If unauthorized, clear user data
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          401
        ) {
          clearUserData();
          return null;
        }

        // Return locally stored user data as fallback only if we're not unauthorized
        const localUserData = getUserData();
        return localUserData;
      }
    },
    initialData: () => {
      // Only use initial data if we have a token
      return isLoggedIn() ? getUserData() : null;
    },
    retry: 1,
    retryDelay: 1000,
    // Set a stale time to prevent excessive refetching
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const result = await loginApi(data);

      // If login API returns success: false, throw an error to trigger onError
      if (!result.success) {
        throw new Error(result.error || "ავტორიზაცია ვერ მოხერხდა");
      }

      return result;
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        // Make sure we're storing the profile image URL as well
        if (data.user.profileImage) {
          localStorage.setItem("userProfileImage", data.user.profileImage);
        }
        queryClient.setQueryData(["user"], data.user);
      }
    },
    onError: (error) => {
      console.error("Login error in mutation:", error);
      // Error will be available via loginMutation.error
    },
  });
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.setQueryData(["user"], null);
      window.location.href = "/login"; // Force a full page refresh to reset all state
    },
  });

  return {
    user,
    isLoading,
    error,
    status,
    isLoggedIn: !!user,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    loginStatus: loginMutation.status,
    logoutStatus: logoutMutation.status,
    loginError: loginMutation.error,
  };
}
