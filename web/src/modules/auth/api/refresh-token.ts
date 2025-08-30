import { clearUserData, refreshTokens } from "@/lib/auth";

export async function refreshToken(): Promise<boolean> {
  try {
    // Use the HTTP-only cookie refresh function
    await refreshTokens();
    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    clearUserData();
    return false;
  }
}
