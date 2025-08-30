import { useState, useEffect } from 'react';
import { 
  getAccessToken, 
  hasValidSessionToken, 
  isDeviceTrusted,
  getUserData 
} from '@/lib/auth';
import { User } from '@/types';

export interface AuthState {
  isAuthenticated: boolean;
  isSessionValid: boolean;
  isDeviceTrusted: boolean;
  user: User | null;
  loading: boolean;
}

export const useAuth = (): AuthState => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isSessionValid: false,
    isDeviceTrusted: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const accessToken = getAccessToken();
        const userData = getUserData();
        
        const isAuthenticated = !!accessToken;
        const isSessionValid = hasValidSessionToken();
        const deviceTrusted = isDeviceTrusted();

        setAuthState({
          isAuthenticated,
          isSessionValid,
          isDeviceTrusted: deviceTrusted,
          user: userData,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to check auth status:', error);
        setAuthState({
          isAuthenticated: false,
          isSessionValid: false,
          isDeviceTrusted: false,
          user: null,
          loading: false,
        });
      }
    };

    checkAuthStatus();

    // Listen for storage changes (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('soulart_')) {
        checkAuthStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return authState;
};

// Hook specifically for checking if extended authentication is available
export const useExtendedAuth = () => {
  const { isAuthenticated, isSessionValid, isDeviceTrusted } = useAuth();
  
  return {
    // User has basic authentication
    hasBasicAuth: isAuthenticated,
    // User has extended session (trusted device)
    hasExtendedAuth: isAuthenticated && isSessionValid && isDeviceTrusted,
    // User can perform sensitive operations without re-authentication
    canPerformSensitiveOps: isAuthenticated && isSessionValid && isDeviceTrusted,
  };
};
