import axios from "axios";
import { clearUserData, refreshTokens } from "./auth";

// Create the main API client - this will be the single source of truth
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Keep backward compatibility
export const axiosInstance = apiClient;

// საჯარო მარშრუტები, რომლებიც არ საჭიროებენ ავტორიზაციას
const publicRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/sellers-register",
  "/auth/refresh", // Don't refresh on refresh endpoint to avoid infinite loops
  "/login",
  "/register",
  "/sellers-register",
  "/become-seller",
  "forgot-password",
  "reset-password",
  "logout",
  "/products", // Public product browsing
];

// Request interceptor for HTTP-only cookie system
apiClient.interceptors.request.use(
  (config) => {
    // With HTTP-only cookies, no need to manually add Authorization header
    // Cookies are automatically included with credentials: 'include'
    config.withCredentials = true;
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Track if we're already refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor with automatic token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Removed success logging for production - only errors will be logged
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = error.config?.url || "";

    // Only log errors, not every interceptor trigger
    if (error.response) {
      console.error(
        `❌ API Error [${error.response.status}] ${requestUrl}`,
        error.response.data
      );
    } else {
      console.error("❌ Network Error:", error.message);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't redirect for guest-accessible endpoints - just return the error
      const guestAccessibleEndpoints = ["/cart/validate", "/orders"];
      const isGuestEndpoint = guestAccessibleEndpoints.some((endpoint) =>
        requestUrl.includes(endpoint)
      );

      if (isGuestEndpoint) {
        return Promise.reject(error);
      }

      // Check if this is a public route - be more specific to avoid false positives
      const isPublicRoute = publicRoutes.some((route) => {
        // Special case for /auth/profile - should NOT be considered public
        if (requestUrl.includes("/auth/profile")) {
          return false;
        }

        const routePattern = route.replace(/\*/g, ".*");
        const regex = new RegExp(`^.*${routePattern}`);
        return regex.test(requestUrl);
      });

      if (isPublicRoute) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResult = await refreshTokens();
        processQueue(null, "refreshed");
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error(`❌ Token refresh failed, redirecting to login`);
        processQueue(
          refreshError instanceof Error
            ? refreshError
            : new Error("Token refresh failed"),
          null
        );
        clearUserData();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Export both names for compatibility
export { axiosInstance as axios };
