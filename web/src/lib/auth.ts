// Token storage and management utilities

import { User } from "@/types";

// Token storage keys
const ACCESS_TOKEN_KEY = "soulart_access_token";
const REFRESH_TOKEN_KEY = "soulart_refresh_token";
const SESSION_TOKEN_KEY = "soulart_session_token"; // New session token
const USER_DATA_KEY = "soulart_user_data";
const DEVICE_FINGERPRINT_KEY = "soulart_device_fp";

// Store tokens in localStorage (access token) and memory (refresh token)
// We avoid storing refresh token in localStorage for better security
let refreshTokenInMemory: string | null = null;

// Generate device fingerprint for hybrid auth
export const generateDeviceFingerprint = (): string => {
  if (typeof window === "undefined") return "";
  
  try {
    const components = [
      navigator.userAgent || "",
      navigator.language || "",
      screen.width + "x" + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      navigator.platform || "",
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

// Store tokens - now with session token support
export const storeTokens = (
  accessToken: string, 
  refreshToken: string, 
  sessionToken?: string
) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    refreshTokenInMemory = refreshToken;

    // Store session token for device trust
    if (sessionToken) {
      localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
    }

    // Also store refresh token in a session storage as a fallback
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error("Failed to store tokens:", error);
  }
};

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

// Get access token
export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get access token:", error);
    return null;
  }
};

// Get refresh token
export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;

  // First try in-memory token
  if (refreshTokenInMemory) return refreshTokenInMemory;

  // Fallback to session storage
  try {
    const token = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (token) {
      refreshTokenInMemory = token; // Restore in-memory copy
    }
    return token;
  } catch (error) {
    console.error("Failed to get refresh token:", error);
    return null;
  }
};

// Get session token
export const getSessionToken = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get session token:", error);
    return null;
  }
};

// Check if user has a valid session token (for trusted device detection)
export const hasValidSessionToken = (): boolean => {
  const sessionToken = getSessionToken();
  if (!sessionToken) return false;
  
  try {
    // Basic JWT structure validation
    const parts = sessionToken.split('.');
    if (parts.length !== 3) return false;
    
    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    const now = Date.now() / 1000;
    
    return payload.exp > now;
  } catch (error) {
    console.error("Failed to validate session token:", error);
    return false;
  }
};

// Check if current device is trusted (based on session token)
export const isDeviceTrusted = (): boolean => {
  const sessionToken = getSessionToken();
  if (!sessionToken) return false;
  
  try {
    const parts = sessionToken.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.deviceTrusted === true;
  } catch (error) {
    console.error("Failed to check device trust status:", error);
    return false;
  }
};

// Clear tokens (logout)
export const clearTokens = () => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    refreshTokenInMemory = null;
  } catch (error) {
    console.error("Failed to clear tokens:", error);
  }
};

// Check if user is logged in (has a token)
export const isLoggedIn = (): boolean => {
  return !!getAccessToken();
};

// Check if a token is about to expire (within 5 minutes)
export const isTokenAboutToExpire = (): boolean => {
  try {
    const token = getAccessToken();
    if (!token) return true;

    // Decode the JWT to get the expiration time
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const { exp } = JSON.parse(jsonPayload);

    if (!exp) return true;

    // Check if the token will expire in the next 5 minutes
    const expirationTime = exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;

    return timeUntilExpiration < 5 * 60 * 1000; // 5 minutes in milliseconds
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // Assume token is about to expire if there's an error
  }
};

// Parse tokens from URL hash (for OAuth callbacks)
export const parseTokensFromHash = (): {
  accessToken?: string;
  refreshToken?: string;
  sessionToken?: string;
  userData?: User;
} => {
  if (typeof window === "undefined") return {};

  try {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get("accessToken") || undefined;
    const refreshToken = params.get("refreshToken") || undefined;
    const sessionToken = params.get("sessionToken") || undefined;
    let userData = undefined;

    const userDataParam = params.get("userData");
    if (userDataParam) {
      try {
        userData = JSON.parse(decodeURIComponent(userDataParam));
      } catch (e) {
        console.error("Failed to parse user data from URL hash", e);
      }
    }

    if (accessToken && refreshToken) {
      storeTokens(accessToken, refreshToken, sessionToken);
      if (userData) {
        storeUserData(userData);
      }
    }

    return { accessToken, refreshToken, sessionToken, userData };
  } catch (error) {
    console.error("Failed to parse tokens from hash:", error);
    return {};
  }
};

// Initialize - restore in-memory refresh token from session storage
// Call this when your app starts
export const initializeAuth = () => {
  if (typeof window === "undefined") return;

  try {
    const token = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (token) {
      refreshTokenInMemory = token;
    }
  } catch (error) {
    console.error("Failed to initialize auth:", error);
  }
};

// Refresh access token using refresh token
export const refreshAccessToken = async (): Promise<{
  accessToken: string;
  refreshToken: string;
  sessionToken?: string;
} | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const deviceInfo = {
      fingerprint: getDeviceFingerprint(),
      userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
    };

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken,
        deviceInfo,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    
    if (data.tokens) {
      const { accessToken, refreshToken: newRefreshToken, sessionToken } = data.tokens;
      storeTokens(accessToken, newRefreshToken, sessionToken);
      return data.tokens;
    }

    return null;
  } catch (error) {
    console.error("Failed to refresh access token:", error);
    // Clear tokens if refresh fails
    clearTokens();
    return null;
  }
};
