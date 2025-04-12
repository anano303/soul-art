'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

interface FacebookMessengerFallbackProps {
  pageId: string;
}

export default function FacebookMessengerFallback({ pageId }: FacebookMessengerFallbackProps) {
  const [scriptFailed, setScriptFailed] = useState(false);
  
  useEffect(() => {
    // If standard approach failed, we'll try a more direct approach
    if (scriptFailed && !window.FB) {
      try {
        // Direct embed approach as fallback
        const script = document.createElement('script');
        script.innerHTML = `
          window.fbAsyncInit = function() {
            FB.init({
              xfbml: true,
              version: 'v18.0'
            });
          };
          (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
            fjs.parentNode.insertBefore(js, fjs);
          }(document, 'script', 'facebook-jssdk'));
        `;
        document.head.appendChild(script);
        console.log('Using fallback approach for Facebook Messenger');
      } catch (error) {
        console.error('Fallback Facebook SDK loading failed:', error);
      }
    }
  }, [scriptFailed]);

  return (
    <>
      <div id="fb-root"></div>
      
      {/* Standard approach - try first */}
      <Script
        id="facebook-jssdk-fallback"
        strategy="lazyOnload"
        src="https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js"
        onLoad={() => console.log('Facebook SDK loaded')}
        onError={() => setScriptFailed(true)}
      />
      <div 
        className="fb-customerchat"
        data-page_id={pageId}
        data-attribution="biz_inbox"
      ></div>
    </>
  );
}
