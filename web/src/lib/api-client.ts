import axios from "axios";
import type {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

// Create an axios instance with default configs
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Important for working with cookies in cross-domain requests
  withCredentials: true,
});

// Add a request interceptor for HTTP-only cookies
apiClient.interceptors.request.use(
  (config) => {
    // With HTTP-only cookies, no need to manually add Authorization header
    // Cookies are automatically included with withCredentials: true
    return config;
  },
  (error) => Promise.reject(error)
);

// Add interceptors for logging requests and responses
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(
        `API Error [${error.response.status}] from: ${error.config?.url}`,
        error.response.data
      );
    } else {
      console.error("API Error:", error);
    }
    return Promise.reject(error);
  }
);

// We'll add the response interceptor later in a separate function that will be called from process-refresh.ts
// Define interface for the refresh function
interface RefreshAuthTokenFunction {
  (): Promise<void>;
}

// Extend window to include queryClient
declare global {
  interface Window {
    queryClient: {
      setQueryData: (key: unknown[], data: unknown) => void;
    };
  }
}

export const setupResponseInterceptors = (
  refreshAuthTokenFn: RefreshAuthTokenFunction
): void => {
  // Clear existing interceptors if any
  apiClient.interceptors.response.clear();

  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Skip auth endpoints to avoid infinite loops
      const isAuthEndpoint =
        originalRequest.url?.includes("/auth/") &&
        !originalRequest.url?.includes("/auth/profile");

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // If we're already retrying or it's not a 401, reject immediately
      if (originalRequest._retry || error.response?.status !== 401) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        await refreshAuthTokenFn();
        // With HTTP-only cookies, no need to update Authorization header
        // Cookies will be included automatically on retry
        return apiClient(originalRequest);
      } catch (refreshError: unknown) {
        console.error("❌ Error during refresh:", refreshError);
        // Clear user data in query client to fix UI state
        const queryClient = window.queryClient;
        if (queryClient) {
          queryClient.setQueryData(["user"], null);
        }
        return Promise.reject(error);
      }
    }
  );
};
