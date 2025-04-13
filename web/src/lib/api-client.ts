import axios from 'axios';
import { getAccessToken, isTokenAboutToExpire } from './auth';
import { refreshAuthToken } from './process-refresh';

// Create an axios instance with default configs
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Important for working with cookies in cross-domain requests
  withCredentials: true,
});

// Add a request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = getAccessToken();
    if (token) {
      // Check if token is about to expire and try to refresh it
      if (isTokenAboutToExpire()) {
        console.log('Token about to expire, attempting to refresh before request');
        try {
          await refreshAuthToken();
          // Get the new token after refresh
          const newToken = getAccessToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        } catch (error) {
          console.error('Failed to refresh token before request:', error);
          // Continue with the existing token if refresh fails
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else {
        // Set the Authorization header for every request if token exists
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  return !!getAccessToken();
};
