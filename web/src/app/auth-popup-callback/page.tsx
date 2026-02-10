'use client';

import { useEffect } from 'react';
import { storeUserData } from '@/lib/auth';

/**
 * This page handles OAuth popup callbacks.
 * It's loaded in the popup window on the website domain,
 * allowing us to communicate with the opener via postMessage or localStorage.
 */
export default function AuthPopupCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const error = urlParams.get('error');
      const isNewUser = urlParams.get('isNewUser') === 'true';
      const isSeller = urlParams.get('isSeller') === 'true';
      const needsSellerRegistration = urlParams.get('needsSellerRegistration') === 'true';
      
      if (success === 'true') {
        console.log('[Popup Callback] Success, fetching user profile...');
        
        try {
          // Fetch user profile to store in localStorage
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('[Popup Callback] User data received');
            storeUserData(userData);
          }
        } catch (e) {
          console.error('[Popup Callback] Failed to fetch user profile:', e);
        }
        
        const messageData = { 
          type: 'GOOGLE_AUTH_SUCCESS',
          isNewUser,
          isSeller,
          needsSellerRegistration,
          timestamp: Date.now()
        };
        
        // Set localStorage flag for the opener to detect
        localStorage.setItem('google_auth_success', JSON.stringify(messageData));
        
        // Try postMessage to opener
        if (window.opener) {
          try {
            window.opener.postMessage(messageData, window.location.origin);
            console.log('[Popup Callback] postMessage sent');
          } catch (e) {
            console.error('[Popup Callback] postMessage failed:', e);
          }
        }
        
        // Close the popup
        setTimeout(() => {
          window.close();
        }, 100);
        
      } else if (error) {
        console.log('[Popup Callback] Error:', error);
        
        if (window.opener) {
          try {
            window.opener.postMessage(
              { type: 'GOOGLE_AUTH_ERROR', error },
              window.location.origin
            );
          } catch (e) {
            console.error('[Popup Callback] postMessage failed:', e);
          }
        }
        
        localStorage.setItem('google_auth_error', JSON.stringify({ 
          type: 'GOOGLE_AUTH_ERROR',
          error,
          timestamp: Date.now()
        }));
        
        setTimeout(() => {
          window.close();
        }, 100);
      }
    };
    
    handleCallback();
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p>Authentication complete. This window will close automatically...</p>
      </div>
    </div>
  );
}
