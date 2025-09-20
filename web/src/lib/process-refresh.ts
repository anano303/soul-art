import { setupResponseInterceptors } from "./api-client";
import { clearUserData, refreshTokens } from "./auth";

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

    try {
      await refreshTokens();

      // With HTTP-only cookies, we don't get specific token values
      // Just signal that refresh was successful
      processQueue(null, "refreshed");
      resetRefreshState();
      return true;
    } catch (refreshError) {
      clearUserData();
      // Don't log expected 401 errors in development
      if (
        process.env.NODE_ENV === "development" &&
        refreshError instanceof Error &&
        refreshError.message.includes("Session expired")
      ) {
        // Silent handling for expected auth failures
      } else {
        console.error("❌ Unexpected refresh error:", refreshError);
      }
      processQueue(
        refreshError instanceof Error
          ? refreshError
          : new Error("Token refresh failed")
      );
      resetRefreshState();
      return false;
    }
  } catch (error) {
    // Don't log routine auth check failures in development
    if (
      process.env.NODE_ENV === "development" &&
      error instanceof Error &&
      error.message.includes("Session expired")
    ) {
      // Silent handling for expected auth failures
    } else {
      console.error("❌ Token refresh error:", error);
    }
    clearUserData();
    processQueue(error);
    resetRefreshState();
    return false;
  }
};

// Check and refresh auth if needed
export const checkAndRefreshAuth = async (): Promise<boolean> => {
  // With HTTP-only cookies, we don't need to check tokens client-side
  // The server will handle token validation automatically
  try {
    const success = await refreshAuthToken();
    return success;
  } catch (error) {
    // Don't log expected auth failures - user is simply not logged in
    if (error instanceof Error && error.message.includes("Session expired")) {
      if (process.env.NODE_ENV === "development") {
        console.debug("🔐 User is not authenticated - this is normal");
      }
    } else {
      console.error("Failed to refresh token during init:", error);
    }
    return false;
  }
};

// Setup response interceptors with the refreshAuthToken function
setupResponseInterceptors(async () => {
  await refreshAuthToken();
  return;
});
