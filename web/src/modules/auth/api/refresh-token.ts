import { apiClient } from "@/lib/api-client";
import { getRefreshToken, storeTokens, clearTokens } from "@/lib/auth";

export async function refreshToken(): Promise<boolean> {
  try {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      clearTokens();
      return false;
    }
    
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    
    if (response.data?.tokens) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.tokens;
      storeTokens(accessToken, newRefreshToken);
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
