'use client';

import { useEffect, useRef } from 'react';

interface FacebookMessengerSDKProps {
  pageId: string;
  themeColor?: string;
  languageCode?: string;
}

export default function FacebookMessengerSDK({
  pageId,
  themeColor = '#6b32a8',
  languageCode = 'en_US' // Default to English which is most reliable
}: FacebookMessengerSDKProps) {
  const isMounted = useRef(false);
  
  useEffect(() => {
    if (isMounted.current) return;
    isMounted.current = true;
    
    console.log('Setting up Facebook Messenger with page ID:', pageId);
    
    try {
      // Create a root div if it doesn't exist
      if (!document.getElementById('fb-root')) {
        const fbRoot = document.createElement('div');
        fbRoot.id = 'fb-root';
        document.body.appendChild(fbRoot);
      }
      
      // Create the messenger chat div
      const chatDiv = document.createElement('div');
      chatDiv.className = 'fb-customerchat';
      chatDiv.setAttribute('page_id', pageId);
      chatDiv.setAttribute('attribution', 'biz_inbox');
      
      // Set theme color if provided
      if (themeColor) {
        chatDiv.setAttribute('theme_color', themeColor);
      }
      
      document.body.appendChild(chatDiv);
      
      // Inject the Facebook SDK script directly
      const script = document.createElement('script');
      script.innerHTML = `
        window.fbAsyncInit = function() {
          FB.init({
            xfbml: true,
            version: 'v18.0'
          });
          console.log('Facebook SDK initialized successfully');
        };
        (function(d, s, id) {
          var js, fjs = d.getElementsByTagName(s)[0];
          if (d.getElementById(id)) return;
          js = d.createElement(s); js.id = id;
          js.src = 'https://connect.facebook.net/${languageCode || 'en_US'}/sdk/xfbml.customerchat.js';
          fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
      `;
      
      document.body.appendChild(script);
      
      console.log('Facebook Messenger script injected');
    } catch (error) {
      console.error('Error setting up Facebook Messenger:', error);
      
      // Try fallback to English if not already using English
      if (languageCode !== 'en_US') {
        console.log('Attempting fallback to English...');
        
        const fallbackScript = document.createElement('script');
        fallbackScript.innerHTML = `
          window.fbAsyncInit = function() {
            FB.init({
              xfbml: true,
              version: 'v18.0'
            });
            console.log('Facebook SDK (fallback) initialized');
          };
          (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
            fjs.parentNode.insertBefore(js, fjs);
          }(document, 'script', 'facebook-jssdk-fallback'));
        `;
        
        document.body.appendChild(fallbackScript);
      }
    }
    
    // Cleanup on unmount
    return () => {
      // It's typically not recommended to remove the Facebook SDK once loaded
    };
  }, [pageId, themeColor, languageCode]);

  // This component doesn't render any visible elements itself
  // The Facebook script will inject the messenger UI
  return null;
}
