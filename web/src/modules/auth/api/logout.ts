import { clearUserData, getDeviceFingerprint } from "@/lib/auth";

export type LogoutOptions = {
  logoutAllDevices?: boolean; // If true, logout from all devices
  deviceFingerprint?: string; // Specific device to logout (defaults to current)
};

export async function logout(options: LogoutOptions = {}) {
  try {
    console.log('🚪 Logging out...', options);
    
    // Prepare logout payload with device info
    const logoutPayload = {
      deviceInfo: {
        fingerprint: options.deviceFingerprint || getDeviceFingerprint(),
        logoutAllDevices: options.logoutAllDevices || false,
      }
    };
    
    // Call server logout to clear HTTP-only cookies
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logoutPayload),
        credentials: 'include', // Include cookies for logout
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Server logout successful:', result.message);
      } else {
        console.error('Server logout failed with status:', response.status);
      }
    } catch (error) {
      console.error('Server logout failed, continuing with client logout:', error);
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear user data locally if logging out current device
    if (!options.deviceFingerprint || options.deviceFingerprint === getDeviceFingerprint() || options.logoutAllDevices) {
      clearUserData();
      console.log('🔒 Local logout completed');
    }
  }
}
