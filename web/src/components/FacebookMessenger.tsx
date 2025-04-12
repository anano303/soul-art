"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Define Facebook SDK types with proper interfaces
interface FacebookInitParams {
  appId?: string;
  xfbml: boolean; 
  version: string; 
  autoLogAppEvents?: boolean;
}

interface FacebookXFBML {
  parse: (element?: Element) => void;
}

interface FacebookSDK {
  init: (options: FacebookInitParams) => void;
  XFBML: FacebookXFBML;
}

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB?: FacebookSDK;
  }
}

export const FacebookMessenger: React.FC = () => {
  const pathname = usePathname();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get values from environment variables with defaults
  const pageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID || "542501458957000";
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "2385644865136914";
  const themeColor = process.env.NEXT_PUBLIC_FACEBOOK_THEME_COLOR || "#6b32a8";
  const language = process.env.NEXT_PUBLIC_LANGUAGE_CODE || "ka_GE";
  
  useEffect(() => {
    // Only initialize Facebook if we're on HTTPS or in production
    const isSecureContext = window.location.protocol === 'https:' || process.env.NODE_ENV === 'production';
    
    if (!isSecureContext) {
      console.warn('Facebook SDK requires HTTPS to work properly. The chat plugin is disabled on HTTP in development.');
      setError('Facebook chat requires HTTPS. It will work when deployed to production.');
      return;
    }
    
    // Initialize Facebook SDK
    window.fbAsyncInit = function() {
      if (window.FB) {
        window.FB.init({
          appId,
          xfbml: true,
          version: 'v18.0',
          autoLogAppEvents: true
        });
        setScriptLoaded(true);
      }
    };

    // Add Facebook SDK script
    const addFacebookScript = () => {
      const d = document;
      const id = 'facebook-jssdk';
      
      // Don't add script if it already exists
      if (d.getElementById(id)) return;
      
      try {
        const fjs = d.getElementsByTagName('script')[0];
        const js = d.createElement('script') as HTMLScriptElement;
        
        js.id = id;
        js.src = `https://connect.facebook.net/${language}/sdk.js`; // Use sdk.js instead of xfbml.customerchat.js
        js.async = true;
        js.crossOrigin = 'anonymous';
        
        if (fjs && fjs.parentNode) {
          fjs.parentNode.insertBefore(js, fjs);
        } else {
          d.head.appendChild(js);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Script loading error: ${errorMessage}`);
      }
    };
    
    addFacebookScript();
    
    // Configure chat properties
    const configureChatbox = () => {
      const chatbox = document.getElementById('fb-customer-chat');
      if (chatbox) {
        chatbox.setAttribute("page_id", pageId);
        chatbox.setAttribute("attribution", "biz_inbox");
        chatbox.setAttribute("theme_color", themeColor);
      }
    };
    
    // Run configuration after a short delay
    const timer = setTimeout(configureChatbox, 300);
    
    // Cleanup
    return () => clearTimeout(timer);
  }, [pageId, appId, themeColor, language]);

  // Force re-parse when route changes
  useEffect(() => {
    if (window.FB && scriptLoaded) {
      window.FB.XFBML.parse();
    }
  }, [pathname, scriptLoaded]);

  return (
    <>
      {/* Messenger Chat Plugin */}
      <div id="fb-root"></div>
      <div id="fb-customer-chat" className="fb-customerchat"></div>

      {/* Error display for debugging */}
      {error && (
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
          <p>Facebook Messenger Error: {error}</p>
          {window.location.protocol === 'http:' && (
            <p>Facebook requires HTTPS. The chat will work when deployed to production.</p>
          )}
        </div>
      )}
    </>
  );
};

export default FacebookMessenger;
