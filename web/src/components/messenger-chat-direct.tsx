"use client";

import { useEffect, useRef } from 'react';

export function MessengerChatDirect() {
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current) return;
    initialized.current = true;
    
    // Create and insert FB root element if it doesn't exist
    let fbRoot = document.getElementById('fb-root');
    if (!fbRoot) {
      fbRoot = document.createElement('div');
      fbRoot.id = 'fb-root';
      document.body.appendChild(fbRoot);
    }
    
    // Create and insert the customer chat div
    const chatDiv = document.createElement('div');
    chatDiv.className = 'fb-customerchat';
    chatDiv.setAttribute('attribution', 'biz_inbox');
    chatDiv.setAttribute('page_id', '542501458957000');
    document.body.appendChild(chatDiv);
    
    // Load the Facebook SDK asynchronously
    (function(d, s, id) {
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      const js = d.createElement(s);
      js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
    
    // Initialize the Facebook SDK
    window.fbAsyncInit = function() {
      window.FB?.init({
        xfbml: true,
        version: 'v19.0'
      });
    };
    
    return () => {
      // Cleanup is not necessary as the chat is meant to persist across pages
      // but we could remove elements if needed
    };
  }, []);
  
  // This component doesn't render anything visibly
  return null;
}
