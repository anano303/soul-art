"use client";

import { useEffect, useRef } from 'react';

export function MessengerChatAlternative() {
  const initialized = useRef(false);

  useEffect(() => {
    // Check if already initialized to prevent duplicate initialization
    if (initialized.current) return;
    
    console.log("MessengerChatAlternative: კომპონენტი დამონტაჟდა");
    initialized.current = true;
    
    // Make sure we're on client side
    if (typeof window === 'undefined') return;
    
    // Create fb-root if it doesn't exist
    let fbRoot = document.getElementById('fb-root');
    if (!fbRoot) {
      fbRoot = document.createElement('div');
      fbRoot.id = 'fb-root';
      document.body.appendChild(fbRoot);
    }
    
    // Create chat element
    const chatDiv = document.createElement('div');
    chatDiv.className = 'fb-customerchat';
    chatDiv.setAttribute('attribution', 'biz_inbox');
    chatDiv.setAttribute('page_id', '542501458957000');
    document.body.appendChild(chatDiv);
    
    // Define Facebook initialization
    window.fbAsyncInit = function() {
      console.log("fbAsyncInit გამოძახებულია ალტერნატიული მეთოდით");
      window.FB?.init({
        xfbml: true,
        version: 'v19.0'
      });
    };
    
    // Load Facebook SDK
    (function(d, s, id) {
      const js = d.createElement(s);
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
    
    return () => {
      console.log("MessengerChatAlternative: კომპონენტი წაიშალა");
      // We don't want to clean up the chat widget on unmount
      // as it should persist across page navigations
    };
  }, []);
  
  return null;
}
