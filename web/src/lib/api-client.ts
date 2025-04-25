import axios from "axios";
import { getAccessToken } from "./auth";
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Create an axios instance with default configs
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Important for working with cookies in cross-domain requests
  withCredentials: true,
});

// Add a request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      // Set the Authorization header for every request if token exists
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  return !!getAccessToken();
};

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

export const setupResponseInterceptors = (refreshAuthTokenFn: RefreshAuthTokenFunction): void => {
  // Clear existing interceptors if any
  apiClient.interceptors.response.clear();

  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

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

      // If there's no access token or refresh token, reject immediately
      const token = getAccessToken();
      if (!token) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        await refreshAuthTokenFn();
        // Update the Authorization header with new token
        originalRequest.headers.Authorization = `Bearer ${getAccessToken()}`;
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
