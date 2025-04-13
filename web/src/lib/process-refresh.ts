import { apiClient } from "./api-client";

import { getRefreshToken, getAccessToken, storeTokens, clearTokens } from "./auth";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Reset function for cleanup
const resetRefreshState = () => {
  isRefreshing = false;
  failedQueue = [];
};

// Refresh token function
export const refreshAuthToken = async (): Promise<boolean> => {
  try {
    console.log('📡 Attempting to refresh token');
    
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      console.log('❌ No refresh token found');
      clearTokens();
      return false;
    }

    // Using axios directly with baseURL to avoid interceptors
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip auth endpoints to avoid infinite loops
    const isAuthEndpoint = originalRequest.url?.includes('/auth/') && 
                           !originalRequest.url?.includes('/auth/profile');
    
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // If we're already retrying or it's not a 401, reject immediately
    if (originalRequest._retry || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // If there's no access token or refresh token, reject immediately
    if (!getAccessToken() || !getRefreshToken()) {
      clearTokens();
      return Promise.reject(error);
    }

    // Safety check - if we somehow got stuck
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const success = await refreshAuthToken();
      if (success) {
        console.log('🔄 Retrying original request with new token');
        // Update the Authorization header with new token
        originalRequest.headers.Authorization = `Bearer ${getAccessToken()}`;
        processQueue(null, "refreshed");
        return apiClient(originalRequest);
      } else {
        console.log('❌ Token refresh failed, rejecting original request');
        processQueue(new Error("Token refresh failed"), null);
        // Clear user data in query client to fix UI state
        const queryClient = window.queryClient;
        if (queryClient) {
          queryClient.setQueryData(['user'], null);
        }
        return Promise.reject(error);
      }
    } catch (refreshError) {
      console.error('❌ Error during refresh:', refreshError);
      processQueue(refreshError, null);
      // Clear user data in query client to fix UI state
      const queryClient = window.queryClient;
      if (queryClient) {
        queryClient.setQueryData(['user'], null);
      }
      return Promise.reject(refreshError);
    } finally {
      resetRefreshState();
    }
  }
);

// Export a function to check auth status and potentially refresh token on app start
export const checkAndRefreshAuth = async (): Promise<boolean> => {
  if (!getAccessToken() && !getRefreshToken()) {
    return false;
  }
  
  if (!getAccessToken() && getRefreshToken()) {
    return await refreshAuthToken();
  }
  
  return true;
};
