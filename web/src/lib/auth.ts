// Token storage and management utilities (HTTP-only cookies approach)

import { User } from "@/types";

// Only store user data and device fingerprint in localStorage
// Tokens are now handled via HTTP-only cookies
const USER_DATA_KEY = "soulart_user_data";
const DEVICE_FINGERPRINT_KEY = "soulart_device_fp";

// Generate device fingerprint for hybrid auth
export const generateDeviceFingerprint = (): string => {
  if (typeof window === "undefined") return "";
  
  try {
    // Check if we already have a stored fingerprint
    const existingFingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (existingFingerprint) {
      return existingFingerprint;
    }
    
    // Generate stable fingerprint (without screen dimensions to avoid mobile orientation issues)
    const components = [
      navigator.userAgent || "",
      navigator.language || "",
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      // Add a random UUID for uniqueness on first generation
      crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    ].join("|");
    
    // Simple hash function (for production, use a crypto library)
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      const char = components.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const fingerprint = Math.abs(hash).toString(16);
    localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    return fingerprint;
  } catch (error) {
    console.error("Failed to generate device fingerprint:", error);
    return "unknown";
  }
};

// Get device fingerprint
export const getDeviceFingerprint = (): string => {
  if (typeof window === "undefined") return "";
  
  try {
    let fingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (!fingerprint) {
      fingerprint = generateDeviceFingerprint();
    }
    return fingerprint;
  } catch (error) {
    console.error("Failed to get device fingerprint:", error);
    return "unknown";
  }
};

// Store user data (tokens are handled by HTTP-only cookies)
export const storeUserData = (userData: User) => {
  if (typeof window === "undefined" || !userData) return;

  try {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error("Failed to store user data:", error);
  }
};

// Get user data
export const getUserData = () => {
  if (typeof window === "undefined") return null;

  try {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Failed to get user data:", error);
    return null;
  }
};

// Clear user data (for logout)
export const clearUserData = () => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(USER_DATA_KEY);
  } catch (error) {
    console.error("Failed to clear user data:", error);
  }
};

// Check if user is logged in (check for user data - tokens are handled by server)
export const isLoggedIn = (): boolean => {
  return !!getUserData();
};

// Login function - now expects server to set HTTP-only cookies
export const login = async (email: string, password: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies in requests
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Login failed");
  }

  const data = await response.json();
  
  // Store user data (server sets HTTP-only cookies)
  if (data.user) {
    storeUserData(data.user);
  }

  return data;
};

// Register function - now expects server to set HTTP-only cookies
export const register = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies in requests
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Registration failed");
  }

  const data = await response.json();
  
  // Store user data (server sets HTTP-only cookies)
  if (data.user) {
    storeUserData(data.user);
  }

  return data;
};

// Logout function - calls server to clear HTTP-only cookies
export const logout = async () => {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include", // Include cookies in requests
    });
  } catch (error) {
    console.error("Logout request failed:", error);
  }
  
  // Clear user data
  clearUserData();
};

// Refresh tokens - server handles HTTP-only cookies
export const refreshTokens = async () => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies in requests
    body: JSON.stringify({
      deviceInfo: {
        fingerprint: getDeviceFingerprint(),
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Refresh token is invalid, user needs to login again
      clearUserData();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error("Failed to refresh tokens");
  }

  return await response.json();
};

// Check authentication status - simplified since server handles tokens
export const checkAuthStatus = async (): Promise<{ isAuthenticated: boolean; user?: User }> => {
  try {
    // Try to get current user info from server
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
      method: "GET",
      credentials: "include", // Include cookies in requests
    });

    if (response.ok) {
      const userData = await response.json();
      storeUserData(userData);
      return { isAuthenticated: true, user: userData };
    } else if (response.status === 401) {
      // Try to refresh tokens
      try {
        await refreshTokens();
        // Try again after refresh
        const retryResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
          method: "GET",
          credentials: "include",
        });
        
        if (retryResponse.ok) {
          const userData = await retryResponse.json();
          storeUserData(userData);
          return { isAuthenticated: true, user: userData };
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
      }
    }

    clearUserData();
    return { isAuthenticated: false };
  } catch (error) {
    console.error("Auth status check failed:", error);
    clearUserData();
    return { isAuthenticated: false };
  }
};
