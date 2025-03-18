import axios from "axios";

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

// მარტივი რექვესთ ინტერცეპტორი
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// მარტივი რესპონს ინტერცეპტორი
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // შევამოწმოთ არის თუ არა მიმდინარე მარშრუტი საჯარო
      const currentPath = window.location.pathname;
      const isPublicRoute = publicRoutes.some(
        (route) =>
          currentPath.includes(route) || error.config.url?.includes(route)
      );

      if (!isPublicRoute) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export { axiosInstance as axios };
