'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Facebook Messenger component with SSR disabled
const FacebookMessengerSDK = dynamic(
  () => import('./FacebookMessengerSDK'),
  { ssr: false }
);

// Import fallback chat invitation
const ChatInvitation = dynamic(
  () => import('./ChatInvitation'),
  { ssr: false }
);

export default function MessengerWrapper() {
  const [mounted, setMounted] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);

  useEffect(() => {
    try {
      setMounted(true);
      const protocol = window.location.protocol === 'https:';
      const isDev = process.env.NODE_ENV === 'development';
      
      // In development, we'll show the chat even on HTTP for testing
      // In production, we require HTTPS
      setIsSecure(protocol || isDev);
      
      // Check if messenger is enabled via env variable
      setIsEnabled(process.env.NEXT_PUBLIC_FB_MESSENGER_ENABLED === 'true');
      
      // Check if SDK loaded successfully within 5 seconds
      const timeoutId = setTimeout(() => {
        if (!window.FB) {
          console.log('Facebook SDK failed to load in time, using fallback');
          setSdkFailed(true);
        }
      }, 5000);
      
      // Listen for errors with Facebook SDK
      const handleError = (event: ErrorEvent) => {
        if (event.message.includes('Facebook') || 
            event.message.includes('FB') || 
            (event.filename && event.filename.includes('facebook'))) {
          console.error('Facebook SDK error detected:', event.message);
          setUseFallback(true);
        }
      };
      
      window.addEventListener('error', handleError);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('error', handleError);
      };
    } catch (err) {
      console.error('Error initializing Messenger:', err);
      setUseFallback(true);
    }
  }, []);

  // Don't render anything until client-side
  if (!mounted || !isEnabled) {
    return null;
  }

  const pageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID || '';
  const themeColor = process.env.NEXT_PUBLIC_FACEBOOK_THEME_COLOR || '#6b32a8';
  
  // Use English which is more reliable
  const language = 'en_US';
  
  // Error handling and validation
  if (!pageId) {
    console.error('Facebook Page ID is missing');
    return null;
  }

  // Show fallback if needed
  if (useFallback || sdkFailed) {
    return <ChatInvitation pageId={pageId} />;
  }

  return (
    <>
      {isSecure && (
        <FacebookMessengerSDK 
          pageId={pageId}
          themeColor={themeColor}
          languageCode={language}
        />
      )}
      
      {!isSecure && process.env.NODE_ENV === 'development' && (
        <div 
          style={{ 
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: '#ffcccc',
            padding: '10px',
            border: '1px solid red',
            borderRadius: '5px',
            zIndex: 9999,
            maxWidth: '300px',
            fontSize: '12px'
          }}
        >
          <p>Facebook Messenger requires HTTPS and will only work in production.</p>
        </div>
      )}
    </>
  );
}
