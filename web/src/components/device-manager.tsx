"use client";

import { useState, useEffect } from 'react';
import { 
  getUserDevices, 
  trustCurrentDevice, 
  removeDevice, 
  isCurrentDeviceTrusted,
  cleanupDuplicateDevices,
  removeAllDevices,
  Device 
} from '@/modules/auth/api/device-management';
import { getDeviceFingerprint, isLoggedIn } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/LanguageContext';

export default function DeviceManager() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isCurrentTrusted, setIsCurrentTrusted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();
  const currentFingerprint = getDeviceFingerprint();

  useEffect(() => {
    loadDevices();
    checkCurrentDeviceTrust();
  }, []);

  const loadDevices = async () => {
    try {
      const userDevices = await getUserDevices();
      console.log('Loaded devices:', userDevices);
      setDevices(userDevices);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentDeviceTrust = async () => {
    try {
      const trusted = await isCurrentDeviceTrusted();
      setIsCurrentTrusted(trusted);
    } catch (error) {
      console.error('Failed to check device trust:', error);
    }
  };

  const handleTrustDevice = async () => {
    try {
      const success = await trustCurrentDevice();
      if (success) {
        setIsCurrentTrusted(true);
        toast({
          title: t('deviceManager.deviceTrusted'),
          description: t('deviceManager.extendedSessionEnabled'),
          variant: 'default',
        });
        loadDevices();
        // Re-check device trust status
        await checkCurrentDeviceTrust();
      } else {
        toast({
          title: t('deviceManager.error'),
          description: t('deviceManager.failedToTrustDevice'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to trust device:', error);
      toast({
        title: t('deviceManager.error'),
        description: t('deviceManager.failedToTrustDevice'),
        variant: 'destructive',
      });
    }
  };

  const handleRemoveDevice = async (deviceFingerprint: string) => {
    try {
      const success = await removeDevice(deviceFingerprint);
      if (success) {
        toast({
          title: t('deviceManager.deviceRemoved'),
          description: t('deviceManager.deviceRemovedSuccessfully'),
          variant: 'default',
        });
        loadDevices();
        // Check if current device was removed
        if (deviceFingerprint === currentFingerprint) {
          setIsCurrentTrusted(false);
        }
      } else {
        toast({
          title: t('deviceManager.error'),
          description: t('deviceManager.failedToRemoveDevice'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to remove device:', error);
      toast({
        title: t('deviceManager.error'),
        description: t('deviceManager.failedToRemoveDevice'),
        variant: 'destructive',
      });
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      const success = await cleanupDuplicateDevices();
      if (success) {
        toast({
          title: t('deviceManager.duplicatesCleanedUp'),
          description: t('deviceManager.duplicatesCleanedUpSuccessfully'),
          variant: 'default',
        });
        loadDevices();
      } else {
        toast({
          title: t('deviceManager.error'),
          description: t('deviceManager.failedToCleanupDuplicates'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to cleanup duplicate devices:', error);
      toast({
        title: t('deviceManager.error'),
        description: t('deviceManager.failedToCleanupDuplicates'),
        variant: 'destructive',
      });
    }
  };

  const handleRemoveAllDevices = async () => {
    if (!window.confirm(t('deviceManager.confirmRemoveAll'))) {
      return;
    }
    
    try {
      const success = await removeAllDevices();
      if (success) {
        toast({
          title: t('deviceManager.allDevicesRemoved'),
          description: t('deviceManager.allDevicesRemovedSuccessfully'),
          variant: 'default',
        });
        setDevices([]);
        setIsCurrentTrusted(false);
      } else {
        toast({
          title: t('deviceManager.error'),
          description: t('deviceManager.failedToRemoveAllDevices'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to remove all devices:', error);
      toast({
        title: t('deviceManager.error'),
        description: t('deviceManager.failedToRemoveAllDevices'),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t('deviceManager.title')}</h2>
      
      {/* Current Device Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">{t('deviceManager.currentDevice')}</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {t('deviceManager.deviceId')}: {currentFingerprint.substring(0, 8)}...
            </p>
            <p className={`text-sm font-medium ${isCurrentTrusted ? 'text-green-600' : 'text-yellow-600'}`}>
              {isCurrentTrusted 
                ? t('deviceManager.trusted') 
                : t('deviceManager.untrusted')
              }
            </p>
            {isCurrentTrusted && (
              <p className={`text-xs ${isLoggedIn() ? 'text-green-500' : 'text-orange-500'}`}>
                {isLoggedIn() 
                  ? t('deviceManager.extendedSessionActive')
                  : t('deviceManager.extendedSessionExpired')
                }
              </p>
            )}
          </div>
          {!isCurrentTrusted && (
            <button
              onClick={handleTrustDevice}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {t('deviceManager.trustDevice')}
            </button>
          )}
        </div>
      </div>

      {/* Trusted Devices List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{t('deviceManager.trustedDevices')}</h3>
          <div className="flex gap-2">
            {devices.length > 1 && (
              <button
                onClick={handleCleanupDuplicates}
                className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
              >
                {t('deviceManager.cleanupDuplicates')}
              </button>
            )}
            {devices.length > 0 && (
              <button
                onClick={handleRemoveAllDevices}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                {t('deviceManager.removeAll')}
              </button>
            )}
          </div>
        </div>
        {devices.length === 0 ? (
          <p className="text-gray-600">{t('deviceManager.noTrustedDevices')}</p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.fingerprint} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {device.fingerprint?.substring(0, 8) || 'Unknown'}...
                      {device.fingerprint === currentFingerprint && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {t('deviceManager.thisDevice')}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">{device.userAgent || 'Unknown device'}</p>
                    <p className="text-xs text-gray-500">
                      {t('deviceManager.lastSeen')}: {device.lastSeen ? new Date(device.lastSeen).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  {device.fingerprint && (
                    <button
                      onClick={() => handleRemoveDevice(device.fingerprint)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      {t('deviceManager.remove')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>{t('deviceManager.infoTitle')}:</strong> {t('deviceManager.infoText')}
        </p>
      </div>
    </div>
  );
}
