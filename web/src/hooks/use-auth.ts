import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { login as loginApi, LoginData } from '@/modules/auth/api/login';
import { logout as logoutApi } from '@/modules/auth/api/logout';
import { isLoggedIn, getUserData, clearTokens } from '@/lib/auth';

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Get currently logged in user data
  const { data: user, isLoading, error, status } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      // If no token, don't make the request and immediately return null
      if (!isLoggedIn()) {
        console.log('No token found, user is not logged in');
        return null;
      }
      
      try {
        console.log('Fetching user profile...');
        const response = await apiClient.get('/auth/profile');
        console.log('Successfully fetched user profile');
        return response.data;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        
        // If unauthorized, clear tokens
        if ((error as { response?: { status?: number } })?.response?.status === 401) {
          console.log('Received 401 from profile endpoint, clearing tokens');
          clearTokens();
          return null;
        }
        
        // Return locally stored user data as fallback only if we're not unauthorized
        const localUserData = getUserData();
        console.log('Using local user data as fallback:', localUserData);
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
    mutationFn: (data: LoginData) => loginApi(data),
    onSuccess: (data) => {
      if (data.success && data.user) {
        console.log('Login successful, setting user data');
        queryClient.setQueryData(['user'], data.user);
      }
    },
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      console.log('Logout successful, clearing user data');
      queryClient.setQueryData(['user'], null);
      window.location.href = '/'; // Force a full page refresh to reset all state
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
