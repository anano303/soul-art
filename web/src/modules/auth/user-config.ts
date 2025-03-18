import { authApi } from "@/modules/auth/api/auth-api";
import { AxiosError } from "axios";

export const userQueryConfig = {
  queryKey: ["user"],
  queryFn: authApi.getProfile,
  retry: (failureCount: number, error: AxiosError) => {
    // Allow one retry for 401 errors to give refresh interceptor a chance
    if (error?.response?.status === 401) {
      return failureCount < 1;
    }
    // Don't retry on other auth errors
    if (error?.response?.status === 403) {
      return false;
    }
    // Retry other errors up to 3 times
    return failureCount < 3;
  },
  staleTime: 1000 * 60 * 5,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;
