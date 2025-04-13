import axios from 'axios';
import { getAccessToken, isTokenAboutToExpire, getRefreshToken, storeTokens, clearTokens } from './auth';

// Create an axios instance with default configs
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Important for working with cookies in cross-domain requests
  withCredentials: true,
});

// Function to refresh token that doesn't depend on process-refresh
export const refreshAuthToken = async (): Promise<boolean> => {
  try {
    console.log('📡 Attempting to refresh token');
    
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      console.log('❌ No refresh token found');
      clearTokens();
      return false;
    }

    // Using fetch directly instead of apiClient to avoid circular dependency
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      console.log(`❌ Refresh failed with status ${response.status}`);
      clearTokens();
      return false;
    }
    
    const data = await response.json();
    
    if (data.tokens && data.tokens.accessToken && data.tokens.refreshToken) {
      console.log('✅ Token refresh successful');
      storeTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return true;
    }
    
    console.log('❌ Invalid response format from refresh endpoint');
    clearTokens();
    return false;
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    clearTokens();
    return false;
  }
};

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
