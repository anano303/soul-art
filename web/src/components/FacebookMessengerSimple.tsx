"use client";

import React, { useEffect } from "react";

// FacebookSDK types are defined in global.d.ts

const FacebookMessengerSimple: React.FC = () => {
  // Get the page ID from environment variable or use a default value
  const pageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID || "542501458957000";
  const themeColor = process.env.NEXT_PUBLIC_FACEBOOK_THEME_COLOR || "#6b32a8";

  useEffect(() => {
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
      
      const js = d.createElement(s) as HTMLScriptElement;
      const fjs = d.getElementsByTagName(s)[0];
      
      js.id = id;
      js.src = 'https://connect.facebook.net/ka_GE/sdk/xfbml.customerchat.js';
      
      if (fjs && fjs.parentNode) {
        fjs.parentNode.insertBefore(js, fjs);
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
    </>
  );
};

export default FacebookMessengerSimple;
