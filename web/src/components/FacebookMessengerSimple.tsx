'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function FacebookMessengerSimple() {
  const pageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID;
  const languageCode = process.env.NEXT_PUBLIC_LANGUAGE_CODE || 'ka_GE';
  
  useEffect(() => {
    // Add the Facebook SDK initialization
    window.fbAsyncInit = function() {
      window.FB?.init({
        xfbml: true,
        version: 'v18.0'
      });
    };
    
    // Manually trigger xfbml parsing if FB is already loaded
    if (window.FB) {
      window.FB.XFBML.parse();
    }
  }, []);

  if (!pageId) {
    console.error('Facebook Page ID missing');
    return null;
  }

  return (
    <>
      {/* Facebook SDK */}
      <div id="fb-root"></div>
      <Script
        async
        defer
        crossOrigin="anonymous"
        src={`https://connect.facebook.net/${languageCode}/sdk/xfbml.customerchat.js`}
        strategy="lazyOnload"
        onLoad={() => console.log('Facebook SDK loaded')}
      />
      
      {/* Messenger Chat Plugin */}
      <div 
        className="fb-customerchat"
        attribution="biz_inbox"
        page_id={pageId}
      ></div>
    </>
  );
}
