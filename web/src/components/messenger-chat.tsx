"use client";

import { useEffect, useState } from 'react';
import Script from 'next/script';

export function MessengerChat() {
  // Only render on client side to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Log that the component mounted
    console.log("Messenger Chat: კომპონენტი დამონტაჟდა");
    
    // Facebook's recommended initialization code
    window.fbAsyncInit = function() {
      console.log("fbAsyncInit გამოძახებულია");
      window.FB?.init({
        xfbml: true,
        version: 'v19.0'
      });
      console.log("FB SDK ინიციალიზებულია");
    };
    
    return () => {
      console.log("Messenger Chat: კომპონენტი წაიშალა");
    };
  }, []);

  // Don't render anything during SSR
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* Facebook customer chat code */}
      <div id="fb-root"></div>
      
      {/* Use Facebook's official script loading approach with direct inline script */}
      <Script 
        id="facebook-jssdk"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            (function(d, s, id) {
              const js = d.createElement(s);
              const fjs = d.getElementsByTagName(s)[0];
              if (d.getElementById(id)) return;
              js.id = id;
              js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
              fjs.parentNode.insertBefore(js, fjs);
              console.log("Facebook SDK სკრიპტი ჩატვირთვის პროცესში");
            })(document, 'script', 'facebook-jssdk');
          `
        }}
      />
      
      {/* Customer chat plugin */}
      <div 
        className="fb-customerchat" 
        attribution="biz_inbox" 
        page_id="542501458957000"
        logged_in_greeting="გამარჯობა! როგორ შეგვიძლია დაგეხმაროთ?"
        logged_out_greeting="გამარჯობა! შეგიძლიათ შეგვეკითხოთ ნებისმიერ დროს."
      />
    </>
  );
}
