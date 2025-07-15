import { setupResponseInterceptors } from "./api-client";
import {
  getRefreshToken,
  getAccessToken,
  storeTokens,
  clearTokens,
} from "./auth";

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
    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise<boolean>((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => resolve(!!token),
          reject,
        });
      });
    }
    isRefreshing = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      resetRefreshState();
      return false;
    }

    // Using fetch directly to avoid interceptors
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      }
    );
    const data = await response.json();

    if (data.tokens && data.tokens.accessToken && data.tokens.refreshToken) {
      storeTokens(data.tokens.accessToken, data.tokens.refreshToken);
      processQueue(null, data.tokens.accessToken);
      resetRefreshState();
      return true;
    }

    clearTokens();
    processQueue(new Error("Invalid response format"));
    resetRefreshState();
    return false;
  } catch (error) {
    console.error("❌ Token refresh error:", error);
    clearTokens();
    processQueue(error);
    resetRefreshState();
    return false;
  }
};

// Check and refresh auth if needed
export const checkAndRefreshAuth = async (): Promise<boolean> => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken || !refreshToken) {
    return false;
  }

  // If token is about to expire or we just want to refresh on startup
  try {
    const success = await refreshAuthToken();
    return success;
  } catch (error) {
    console.error("Failed to refresh token during init:", error);
    return false;
  }
};

// Setup response interceptors with the refreshAuthToken function
setupResponseInterceptors(async () => {
  await refreshAuthToken();
  return;
});
