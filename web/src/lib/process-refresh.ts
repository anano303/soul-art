import { getRefreshToken, getAccessToken, clearTokens } from "./auth";
// Import the apiClient but NOT the refreshAuthToken function to avoid circular dependency
import { apiClient } from "./api-client";

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

// Use refreshAuthToken from api-client.ts instead of implementing it here
export const refreshAuthToken = async (): Promise<boolean> => {
  // Import dynamically to avoid circular dependency
  const { refreshAuthToken } = await import('./api-client');
  return refreshAuthToken();
};

// Function to check if the token is about to expire
const isTokenAboutToExpire = (): boolean => {
  const token = getAccessToken();
  if (!token) return false;
  
  try {
    // JWT tokens are base64 encoded with 3 parts: header.payload.signature
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return true; // Invalid token format
    
    // Decode the payload part
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    // Check if exp field exists
    if (!payload.exp) return false;
    
    // If token expiration is within 5 minutes, consider it "about to expire"
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    
    return timeUntilExpiry < 5 * 60 * 1000; // Less than 5 minutes
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true; // If we can't check, assume it needs refresh
  }
};

// Function to check auth state and refresh tokens if needed
export const checkAndRefreshAuth = async (): Promise<boolean> => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    console.log('🔍 No access token found during init');
    return false;
  }
  
  console.log('🔄 Auth initialized, refresh token restored');

  if (isTokenAboutToExpire()) {
    console.log('🔄 Token about to expire, attempting to refresh during init');
    return refreshAuthToken();
  }
  
  return true;
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
