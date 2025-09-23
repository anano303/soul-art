import { clearUserData } from "@/lib/auth";

export async function logout() {
  try {
    console.log('🚪 Logging out...');
    
    // Call server logout to clear HTTP-only cookies
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for logout
      });
      console.log('✅ Server logout successful');
    } catch (error) {
      console.error('Server logout failed, continuing with client logout:', error);
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear user data locally
    clearUserData();
    console.log('🔒 Local logout completed');
  }
}
