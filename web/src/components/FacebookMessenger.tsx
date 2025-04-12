"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB?: {
      init(options: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }): void;
      XFBML: {
        parse(): void;
      };
    };
  }
}

interface FacebookMessengerProps {
  pageId?: string;
  appId?: string;
  loggedInGreeting?: string;
  loggedOutGreeting?: string;
  themeColor?: string;
  language?: string;
}

export const FacebookMessenger: React.FC<FacebookMessengerProps> = ({
  pageId = "542501458957000", // Your page ID
  appId = "2385644865136914", // Your app ID
  loggedInGreeting = "გამარჯობა! როგორ შეგვიძლია დაგეხმაროთ?", 
  loggedOutGreeting = "გამარჯობა! შესვლის შემდეგ შეგვიძლია მოგწეროთ.",
  themeColor = "#6b32a8", // Purple theme color to match your brand
  language = "ka_GE", // Georgian language code
}) => {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize Facebook SDK
    window.fbAsyncInit = function () {
      window.FB?.init({
        appId: appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v18.0",
      });
    };

    // Reload the chat plugin when route changes
    if (window.FB) {
      window.FB.XFBML.parse();
    }
  }, [pathname, appId]);

  return (
    <>
      {/* Facebook SDK */}
      <Script
        id="facebook-sdk"
        strategy="lazyOnload"
        src={`https://connect.facebook.net/${language}/sdk/xfbml.customerchat.js`}
      />

      {/* Messenger Chat Plugin */}
      <div id="fb-root"></div>
      <div
        id="fb-customer-chat"
        className="fb-customerchat"
        data-page_id={pageId}
        data-attribution="biz_inbox"
        data-logged_in_greeting={loggedInGreeting}
        data-logged_out_greeting={loggedOutGreeting}
        data-theme_color={themeColor}
      ></div>
    </>
  );
};

export default FacebookMessenger;
