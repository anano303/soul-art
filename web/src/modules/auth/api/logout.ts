import { clearTokens, getAccessToken } from "@/lib/auth";

export async function logout() {
  try {
    console.log('🚪 Logging out...');
    const token = getAccessToken();
    
    // Only attempt server logout if we have a token
    if (token) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('✅ Server logout successful');
      } catch (error) {
        console.error('Server logout failed, continuing with client logout:', error);
      }
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear tokens locally
    clearTokens();
    console.log('🔒 Local logout completed');
  }
}
