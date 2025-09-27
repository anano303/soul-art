import { apiClient } from "@/lib/axios";
import { getDeviceFingerprint } from "@/lib/auth";

export interface Device {
  fingerprint: string;
  userAgent: string;
  lastSeen: Date;
  trusted: boolean;
  sessionId: string;
  refreshToken?: string;
  refreshTokenJti?: string;
  isActive?: boolean; // Added for backend compatibility
}

// Get user's trusted devices
export async function getUserDevices(): Promise<Device[]> {
  try {
    const response = await apiClient.get('/auth/devices');
    return response.data.devices || [];
  } catch (error) {
    console.error('Failed to get user devices:', error);
    return [];
  }
}

// Trust current device for extended sessions
export async function trustCurrentDevice(): Promise<boolean> {
  try {
    const response = await apiClient.post('/auth/devices/trust', {
      deviceInfo: {
        fingerprint: getDeviceFingerprint()
      }
    });
    
    if (response.data.success) {
      // HTTP-only cookies are automatically set by the server
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to trust device:', error);
    return false;
  }
}

// Remove a trusted device
export async function removeDevice(deviceFingerprint: string): Promise<boolean> {
  try {
    const response = await apiClient.delete(`/auth/devices/${deviceFingerprint}`);
    return response.data.success || false;
  } catch (error) {
    console.error('Failed to remove device:', error);
    return false;
  }
}

// Clean up duplicate devices
export async function cleanupDuplicateDevices(): Promise<boolean> {
  try {
    const response = await apiClient.post('/auth/devices/cleanup');
    return response.data.success || false;
  } catch (error) {
    console.error('Failed to cleanup duplicate devices:', error);
    return false;
  }
}

// Remove all trusted devices
export async function removeAllDevices(): Promise<boolean> {
  try {
    const response = await apiClient.delete('/auth/devices/all');
    return response.data.success || false;
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
