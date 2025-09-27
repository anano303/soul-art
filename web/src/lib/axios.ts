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
  console.log(`📋 Processing queue with ${failedQueue.length} requests. Error: ${error?.message || 'none'}, Token: ${token || 'none'}`);
  
  failedQueue.forEach((prom, index) => {
    if (error) {
      console.log(`❌ Rejecting queued request ${index + 1}`);
      prom.reject(error);
    } else {
      console.log(`✅ Resolving queued request ${index + 1}`);
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor with automatic token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Success [${response.status}] ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = error.config?.url || '';
    
    console.log(`🚨 Interceptor triggered for error response`);
    
    // Enhanced error logging
    if (error.response) {
      console.error(
        `❌ API Error [${error.response.status}] from: ${requestUrl}`,
        error.response.data
      );
    } else {
      console.error("❌ Network Error:", error.message);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log(`🔐 401 Unauthorized detected for: ${requestUrl}`);
      
            // Check if this is a public route - be more specific to avoid false positives
      const isPublicRoute = publicRoutes.some(route => {
        // Special case for /auth/profile - should NOT be considered public
        if (requestUrl.includes('/auth/profile')) {
          console.log(`🔍 Profile endpoint detected - NOT treating as public route`);
          return false;
        }
        
        const routePattern = route.replace(/\*/g, '.*');
        const regex = new RegExp(`^.*${routePattern}`);
        const result = regex.test(requestUrl);
        
        console.log(`🔍 Route check: ${requestUrl} vs ${route} -> ${result}`);
        return result;
      });

      if (isPublicRoute) {
        console.log(`⏭️ Skipping refresh for public route: ${requestUrl}`);
        return Promise.reject(error);
      }

      console.log(`🔄 Attempting token refresh for protected route: ${requestUrl}`);

      if (isRefreshing) {
        console.log(`⏳ Already refreshing token, queuing request: ${requestUrl}`);
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
          console.log(`📋 Added to queue. Queue length: ${failedQueue.length}`);
        })
          .then((token) => {
            console.log(`🔄 Retrying queued request with token: ${requestUrl}`);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            console.error(`❌ Queued request failed: ${requestUrl}`, err);
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      console.log(`🔄 Attempting to refresh tokens for: ${requestUrl}`);
      
      try {
        const refreshResult = await refreshTokens();
        console.log(`✅ Token refresh successful for: ${requestUrl}`, refreshResult);
        
        // With HTTP-only cookies, no need to update Authorization header
        // Just retry the request, cookies will be included automatically
        processQueue(null, 'refreshed');
        
        console.log(`🔄 Retrying original request: ${requestUrl}`);
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error(`❌ Token refresh failed for: ${requestUrl}`, refreshError);
        processQueue(refreshError instanceof Error ? refreshError : new Error('Token refresh failed'), null);
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
