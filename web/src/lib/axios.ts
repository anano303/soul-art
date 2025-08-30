import axios from "axios";
import { clearUserData, refreshTokens } from "./auth";

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// საჯარო მარშრუტები, რომლებიც არ საჭიროებენ ავტორიზაციას
const publicRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/sellers-register",
  "/login",
  "/register",
  "/sellers-register",
  "/",
  "forgot-password",
  "reset-password",
  "profile",
  "logout",
  "products",
  "product/:id",
];

// Request interceptor for HTTP-only cookie system
axiosInstance.interceptors.request.use(
  (config) => {
    // With HTTP-only cookies, no need to manually add Authorization header
    // Cookies are automatically included with credentials: 'include'
    config.withCredentials = true;
    return config;
  },
  (error) => {
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
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is a public route
      const currentPath = window.location.pathname;
      const isPublicRoute = publicRoutes.some(
        (route) =>
          currentPath.includes(route) || error.config.url?.includes(route)
      );

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
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await refreshTokens();
        
        // With HTTP-only cookies, no need to update Authorization header
        // Just retry the request, cookies will be included automatically
        processQueue(null, 'refreshed');
        return axiosInstance(originalRequest);
      } catch (refreshError) {
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

export { axiosInstance as axios };
