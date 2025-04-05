import { storeTokens, storeUserData } from "@/lib/auth";

export type LoginData = {
  email: string;
  password: string;
};

export async function login(data: LoginData) {
  try {
    console.log('🔑 Attempting login...');
    
    // Use fetch directly to avoid interceptors during login
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    
    // First check for non-2xx responses
    if (!response.ok) {
      console.log(`❌ Login failed with status ${response.status}`);
      
      // Try to parse the error message from the response
      try {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.message || "არასწორი მეილი ან პაროლი"
        };
      } catch (error) {
        console.error('Failed to parse error response:', error);
        // If parsing fails, return a generic error message
        return { 
          success: false, 
          error: response.status === 401 
            ? "არასწორი მეილი ან პაროლი"
            : "ავტორიზაცია ვერ მოხერხდა"
        };
      }
    }
    
    // Handle successful response
    const responseData = await response.json();
    
    if (responseData?.tokens?.accessToken && responseData?.tokens?.refreshToken && responseData?.user) {
      const { accessToken, refreshToken } = responseData.tokens;
      console.log('✅ Login successful, storing tokens');
      storeTokens(accessToken, refreshToken);
      storeUserData(responseData.user);
      return { success: true, user: responseData.user };
    }
    
    console.log('❌ Login response missing tokens or user data');
    return { success: false, error: "ავტორიზაცია ვერ მოხერხდა - არასწორი პასუხი სერვერიდან" };
  } catch (error) {
    console.error('❌ Login error:', error);
    return { 
      success: false, 
      error: (error instanceof Error ? error.message : "ავტორიზაცია ვერ მოხერხდა")
    };
  }
}
