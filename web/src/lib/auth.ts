// Token storage and management utilities

import { User } from "@/types";

// Token storage keys
const ACCESS_TOKEN_KEY = 'soulart_access_token';
const REFRESH_TOKEN_KEY = 'soulart_refresh_token';
const USER_DATA_KEY = 'soulart_user_data';

// Store tokens in localStorage (access token) and memory (refresh token)
// We avoid storing refresh token in localStorage for better security
let refreshTokenInMemory: string | null = null;

// Store tokens
export const storeTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    refreshTokenInMemory = refreshToken;
    
    // Also store refresh token in a session storage as a fallback
    // for when the page is refreshed or app restarts
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    
    console.log('🔑 Tokens stored successfully');
  } catch (error) {
    console.error('Failed to store tokens:', error);
  }
};


export const storeUserData = (userData: User) => {
  if (typeof window === 'undefined' || !userData) return;
  
  try {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
};

// Get user data
export const getUserData = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};

// Get access token
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
};

// Get refresh token
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
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
    console.error('Failed to get refresh token:', error);
    return null;
  }
};

// Clear tokens (logout)
export const clearTokens = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    refreshTokenInMemory = null;
    console.log('🗑️ Tokens cleared successfully');
  } catch (error) {
    console.error('Failed to clear tokens:', error);
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
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const { exp } = JSON.parse(jsonPayload);
    
    if (!exp) return true;
    
    // Check if the token will expire in the next 5 minutes
    const expirationTime = exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;
    
    return timeUntilExpiration < 5 * 60 * 1000; // 5 minutes in milliseconds
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume token is about to expire if there's an error
  }
};

// Parse tokens from URL hash (for OAuth callbacks)
export const parseTokensFromHash = (): { accessToken?: string, refreshToken?: string, userData?: User } => {
  if (typeof window === 'undefined') return {};
  
  try {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('accessToken') || undefined;
    const refreshToken = params.get('refreshToken') || undefined;
    let userData = undefined;
    
    const userDataParam = params.get('userData');
    if (userDataParam) {
      try {
        userData = JSON.parse(decodeURIComponent(userDataParam));
      } catch (e) {
        console.error('Failed to parse user data from URL hash', e);
      }
    }
    
    if (accessToken && refreshToken) {
      storeTokens(accessToken, refreshToken);
      if (userData) {
        storeUserData(userData);
      }
      console.log('🔑 Tokens parsed from URL hash');
    }
    
    return { accessToken, refreshToken, userData };
  } catch (error) {
    console.error('Failed to parse tokens from hash:', error);
    return {};
  }
};

// Initialize - restore in-memory refresh token from session storage
// Call this when your app starts
export const initializeAuth = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const token = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (token) {
      refreshTokenInMemory = token;
      console.log('🔄 Auth initialized, refresh token restored');
    }
  } catch (error) {
    console.error('Failed to initialize auth:', error);
  }
};
