"use client";

import React, { useEffect, useState } from "react";


const FacebookMessengerSimple: React.FC = () => {
  // Get the page ID from environment variable or use a default value
  const pageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID || "542501458957000";
  const themeColor = process.env.NEXT_PUBLIC_FACEBOOK_THEME_COLOR || "#6b32a8";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only initialize Facebook if we're on HTTPS or in production
    const isSecureContext = window.location.protocol === 'https:' || process.env.NODE_ENV === 'production';
    
    if (!isSecureContext) {
      console.warn('Facebook SDK requires HTTPS to work properly. The chat plugin is disabled on HTTP in development.');
      setError('Facebook chat requires HTTPS. It will work when deployed to production.');
      return;
    }

    // Load Facebook SDK
    window.fbAsyncInit = function() {
      // Type safety check before accessing FB
      if (window.FB) {
        window.FB.init({
          xfbml: true,
          version: 'v18.0'
        });
      }
    };

    // Add Facebook SDK script to the document
    const addScript = () => {
      const d = document;
      const s = 'script';
      const id = 'facebook-jssdk';
      
      // Check if script already exists
      if (d.getElementById(id)) return;
      
      try {
        const js = d.createElement(s) as HTMLScriptElement;
        const fjs = d.getElementsByTagName(s)[0];
        
        js.id = id;
        js.src = 'https://connect.facebook.net/ka_GE/sdk.js'; // Use sdk.js instead of xfbml.customerchat.js
        js.async = true;
        js.crossOrigin = 'anonymous';
        
        if (fjs && fjs.parentNode) {
          fjs.parentNode.insertBefore(js, fjs);
        } else {
          document.head.appendChild(js);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error loading Facebook SDK:", errorMessage);
      }
    };
    
    addScript();
    
    // Set the attributes for the chat plugin
    const setChatboxAttributes = () => {
      const chatbox = document.getElementById('fb-customer-chat');
      if (chatbox) {
        chatbox.setAttribute("page_id", pageId);
        chatbox.setAttribute("attribution", "biz_inbox");
        
        if (themeColor) {
          chatbox.setAttribute("theme_color", themeColor);
        }
      }
    };
    
    // Set attributes after a small delay to ensure element exists
    setTimeout(setChatboxAttributes, 100);
    
  }, [pageId, themeColor]);

  return (
    <>
      <div id="fb-root"></div>
      <div id="fb-customer-chat" className="fb-customerchat"></div>
      
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

export default FacebookMessengerSimple;
