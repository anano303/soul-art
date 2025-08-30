import { apiClient } from "@/lib/api-client";
import { getRefreshToken, storeTokens, clearTokens, getDeviceFingerprint } from "@/lib/auth";

export async function refreshToken(): Promise<boolean> {
  try {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      clearTokens();
      return false;
    }
    
    const response = await apiClient.post('/auth/refresh', { 
      refreshToken,
      deviceInfo: {
        fingerprint: getDeviceFingerprint(),
        userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
      }
    });
    
    if (response.data?.tokens) {
      const { accessToken, refreshToken: newRefreshToken, sessionToken } = response.data.tokens;
      storeTokens(accessToken, newRefreshToken, sessionToken);
      return true;
    }
    
    clearTokens();
    return false;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    clearTokens();
    return false;
  }
}
