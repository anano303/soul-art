import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { getDeviceFingerprint, storeTokens } from "@/lib/auth";

export interface Device {
  fingerprint: string;
  userAgent: string;
  lastSeen: Date;
  trusted: boolean;
  sessionId: string;
}

// Get user's trusted devices
export async function getUserDevices(): Promise<Device[]> {
  try {
    const response = await fetchWithAuth('/auth/devices');
    const data = await response.json();
    return data.devices || [];
  } catch (error) {
    console.error('Failed to get user devices:', error);
    return [];
  }
}

// Trust current device for extended sessions
export async function trustCurrentDevice(): Promise<boolean> {
  try {
    const response = await fetchWithAuth('/auth/devices/trust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceInfo: {
          fingerprint: getDeviceFingerprint()
        }
      })
    });
    const data = await response.json();
    
    // If new tokens are returned, store them
    if (data.tokens) {
      const { accessToken, refreshToken, sessionToken } = data.tokens;
      storeTokens(accessToken, refreshToken, sessionToken);
    }
    
    return data.success || false;
  } catch (error) {
    console.error('Failed to trust device:', error);
    return false;
  }
}

// Remove a trusted device
export async function removeDevice(deviceFingerprint: string): Promise<boolean> {
  try {
    const response = await fetchWithAuth(`/auth/devices/${deviceFingerprint}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Failed to remove device:', error);
    return false;
  }
}

// Clean up duplicate devices
export async function cleanupDuplicateDevices(): Promise<boolean> {
  try {
    const response = await fetchWithAuth('/auth/devices/cleanup', {
      method: 'POST'
    });
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Failed to cleanup duplicate devices:', error);
    return false;
  }
}

// Remove all trusted devices
export async function removeAllDevices(): Promise<boolean> {
  try {
    const response = await fetchWithAuth('/auth/devices/all', {
      method: 'DELETE'
    });
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Failed to remove all devices:', error);
    return false;
  }
}

// Check if current device is trusted
export async function isCurrentDeviceTrusted(): Promise<boolean> {
  try {
    const devices = await getUserDevices();
    const currentFingerprint = getDeviceFingerprint();
    return devices.some(device => 
      device.fingerprint === currentFingerprint && device.trusted
    );
  } catch (error) {
    console.error('Failed to check device trust:', error);
    return false;
  }
}
