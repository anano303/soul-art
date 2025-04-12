
import { useState, useEffect } from 'react';

// Import already happens in global.d.ts

export function useFacebookSDK(languageCode: string = 'en_US') {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // If the SDK is already loaded
    if (window.FB) {
      setIsLoaded(true);
      return;
    }

    // Set up async init function
    window.fbAsyncInit = function() {
      if (window.FB) {
        window.FB.init({
          xfbml: true,
          version: 'v18.0'
        });
        setIsLoaded(true);
        console.log('Facebook SDK initialized successfully');
      }
    };

    // Function to load the SDK
    const loadSDK = () => {
      try {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = `https://connect.facebook.net/${languageCode}/sdk/xfbml.customerchat.js`;
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => console.log('SDK script loaded');
        script.onerror = (error) => {
          console.error('Error loading Facebook SDK:', error);
          setHasError(true);
          
          // Try fallback to English if not already English
          if (languageCode !== 'en_US') {
            console.log('Trying fallback to English SDK version');
            const fallbackScript = document.createElement('script');
            fallbackScript.id = 'facebook-jssdk-fallback';
            fallbackScript.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
            fallbackScript.async = true;
            fallbackScript.defer = true;
            fallbackScript.crossOrigin = 'anonymous';
            document.head.appendChild(fallbackScript);
          }
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error setting up Facebook SDK:', error);
        setHasError(true);
      }
    };

    // If no script tag exists, create one
    if (!document.getElementById('facebook-jssdk')) {
      loadSDK();
    }

    // Cleanup
    return () => {
      // No need to remove the script as it should persist
    };
  }, [languageCode]);

  return { isLoaded, hasError };
}
