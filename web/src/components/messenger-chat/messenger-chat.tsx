"use client";

import { useEffect, useState } from "react";
import "./messenger-chat.css";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB?: any;
  }
}

export function MessengerChat() {
  const [isDevEnvironment, setIsDevEnvironment] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(
    process.env.NEXT_PUBLIC_MESSENGER_CHAT_ENABLED === 'true'
  );
  
  useEffect(() => {
    // განვსაზღვროთ განვითარების გარემო
    const isLocalHost = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1';
    
    setIsDevEnvironment(isLocalHost);
    
    // თუ ჩატი გამორთულია ან ვართ dev გარემოში და არ გვაქვს მოთხოვნილი ჩართვა
    if (isLocalHost && process.env.NEXT_PUBLIC_MESSENGER_CHAT_ENABLED !== 'true') {
      console.log('Messenger chat disabled in development environment. Set NEXT_PUBLIC_MESSENGER_CHAT_ENABLED=true to enable.');
      return;
    }
    
    // გასუფთავება
    const cleanup = () => {
      const existingScript = document.getElementById('facebook-jssdk');
      if (existingScript) existingScript.remove();
      
      const existingRoot = document.getElementById('fb-root');
      if (existingRoot) existingRoot.remove();
    };
    
    // გასუფთავება გაშვებამდე
    cleanup();
    
    // ჩატის კომპონენტების შექმნა
    const fbRoot = document.createElement('div');
    fbRoot.id = 'fb-root';
    document.body.appendChild(fbRoot);
    
    // Facebook SDK-ს ინიციალიზაცია
    window.fbAsyncInit = function() {
      window.FB?.init({
        xfbml: true,
        version: 'v18.0'
      });
      
      // Customerchat ელემენტის დამატება
      const fbCustomerChat = document.createElement('div');
      fbCustomerChat.id = 'fb-customer-chat';
      fbCustomerChat.className = 'fb-customerchat';
      
      // Using the new ID from the domain verification
      fbCustomerChat.setAttribute('page_id', '699512925859265'); // Updated page ID from verification
      fbCustomerChat.setAttribute('attribution', 'biz_inbox');
      document.body.appendChild(fbCustomerChat);
      
      console.log("Facebook Messenger chat initialized with page ID: 699512925859265");
    };
    
    // SDK-ს ჩატვირთვა
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = 'https://connect.facebook.net/ka_GE/sdk/xfbml.customerchat.js';
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
    
    return () => {
      cleanup();
    };
  }, []);

  if (isDevEnvironment && !isChatEnabled) {
    return (
      <div className="dev-messenger-placeholder">
        <div className="dev-messenger-info">
          <h3>Facebook მესენჯერი გამორთულია</h3>
          <p>
            Facebook-ის მესენჯერი არ მუშაობს localhost-ზე Facebook-ის შეზღუდვების გამო.
            <br />
            ჩატი გამოჩნდება რეალურ დომენზე ({process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN}).
          </p>
          <p className="dev-messenger-hint">
            დეველოპმენტის რეჟიმში ჩასართავად უნდა ჩაწეროთ .env.local ფაილში:<br />
            <code>NEXT_PUBLIC_MESSENGER_CHAT_ENABLED=true</code>
          </p>
          <p className="dev-note">
            <strong>შენიშვნა:</strong> რეალურად მაინც ვერ იმუშავებს localhost-ზე, რადგან Facebook-ი მხოლოდ 
            ნამდვილ დომენებს უშვებს, მაგრამ UI ელემენტები გამოჩნდება.
          </p>
        </div>
        <div className="mock-chat-button">
          <span className="mock-icon">💬</span>
        </div>
      </div>
    );
  }
  
  return null;
}
