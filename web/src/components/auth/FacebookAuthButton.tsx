"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { FaFacebookF } from "react-icons/fa";
import "./FacebookAuthButton.css";

declare global {
  interface Window {
    FB: {
      init: (options: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookAuthResponse) => void,
        options?: { scope: string }
      ) => void;
      logout: (callback?: () => void) => void;
      getLoginStatus: (callback: (response: FacebookAuthResponse) => void) => void;
      api: (
        path: string,
        callback: (response: FacebookUserData) => void
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

interface FacebookAuthResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: {
    accessToken: string;
    userID: string;
    expiresIn: number;
    signedRequest: string;
    graphDomain: string;
    data_access_expiration_time: number;
  };
}

interface FacebookUserData {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
      width: number;
      height: number;
      is_silhouette: boolean;
    };
  };
}

interface FacebookAuthButtonProps {
  onSuccess: (data: {
    accessToken: string;
    userId: string;
    email?: string;
    name: string;
    picture?: string;
  }) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  variant?: "login" | "register" | "seller";
  className?: string;
}

export function FacebookAuthButton({
  onSuccess,
  onError,
  disabled = false,
  variant = "login",
  className = "",
}: FacebookAuthButtonProps) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    picture?: string;
  } | null>(null);

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  // Log on every render to confirm component is mounting
  console.log("[FB Auth] Component rendered, appId:", appId ? "set" : "NOT SET");

  // Fetch user info from Facebook
  const fetchUserInfo = useCallback(() => {
    if (!window.FB) {
      console.log("[FB Auth] fetchUserInfo: FB SDK not available");
      return;
    }

    console.log("[FB Auth] Fetching user info from Graph API...");
    window.FB.api("/me?fields=id,name,email,picture.width(100).height(100)", (response: FacebookUserData) => {
      console.log("[FB Auth] Graph API response:", response);
      if (response && response.name) {
        console.log("[FB Auth] User info received:", {
          name: response.name,
          picture: response.picture?.data?.url,
        });
        setUserInfo({
          name: response.name,
          picture: response.picture?.data?.url,
        });
      } else {
        console.log("[FB Auth] No user name in response");
      }
    });
  }, []);

  // Check if user is already logged in with Facebook
  const checkLoginStatus = useCallback(() => {
    if (!window.FB) {
      console.log("[FB Auth] checkLoginStatus: FB SDK not available");
      return;
    }

    console.log("[FB Auth] Checking login status...");
    window.FB.getLoginStatus((response) => {
      console.log("[FB Auth] Login status:", response.status, response);
      if (response.status === "connected") {
        console.log("[FB Auth] User is connected, fetching user info...");
        fetchUserInfo();
      } else {
        console.log("[FB Auth] User not connected to Facebook");
      }
    });
  }, [fetchUserInfo]);

  // Initialize Facebook SDK
  useEffect(() => {
    if (!appId) {
      console.warn("[FB Auth] Facebook App ID not configured");
      return;
    }

    console.log("[FB Auth] Initializing with App ID:", appId);

    const initFB = () => {
      if (!window.FB) {
        console.log("[FB Auth] FB not available yet");
        return;
      }
      console.log("[FB Auth] Initializing FB SDK...");
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: "v18.0",
      });
      console.log("[FB Auth] SDK initialized successfully");
      setIsSDKLoaded(true);
      checkLoginStatus();
    };

    // Check if SDK is already loaded
    if (window.FB) {
      console.log("[FB Auth] SDK already loaded, initializing...");
      initFB();
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) {
      console.log("[FB Auth] Script already exists, waiting for FB...");
      // Poll for FB to become available
      const checkFB = setInterval(() => {
        if (window.FB) {
          clearInterval(checkFB);
          initFB();
        }
      }, 100);
      return () => clearInterval(checkFB);
    }

    // Set up the async init callback
    window.fbAsyncInit = function () {
      console.log("[FB Auth] fbAsyncInit called");
      initFB();
    };

    // Load SDK script
    console.log("[FB Auth] Loading SDK script...");
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("[FB Auth] SDK script loaded");
      // Also try to init after script loads in case fbAsyncInit wasn't called
      setTimeout(() => {
        if (window.FB && !isSDKLoaded) {
          console.log("[FB Auth] FB available after script load, initializing...");
          initFB();
        }
      }, 100);
    };
    script.onerror = (e) => console.error("[FB Auth] SDK script failed to load:", e);
    document.body.appendChild(script);

    return () => {
      // Cleanup if component unmounts before SDK loads
      const scriptToRemove = document.getElementById("facebook-jssdk");
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [appId, checkLoginStatus, isSDKLoaded]);

  const handleLogin = useCallback(() => {
    console.log("[FB Auth] handleLogin called", { hasFB: !!window.FB, disabled, isLoading });
    if (!window.FB || disabled || isLoading) return;

    setIsLoading(true);
    console.log("[FB Auth] Calling FB.login...");

    window.FB.login(
      (response) => {
        console.log("[FB Auth] FB.login response:", response);
        if (response.status === "connected" && response.authResponse) {
          console.log("[FB Auth] Login successful, fetching user details...");
          // Get user details
          window.FB.api(
            "/me?fields=id,name,email,picture.width(100).height(100)",
            (userResponse: FacebookUserData) => {
              console.log("[FB Auth] User details response:", userResponse);
              setIsLoading(false);
              
              if (userResponse && userResponse.id) {
                setUserInfo({
                  name: userResponse.name,
                  picture: userResponse.picture?.data?.url,
                });

                onSuccess({
                  accessToken: response.authResponse!.accessToken,
                  userId: userResponse.id,
                  email: userResponse.email,
                  name: userResponse.name,
                  picture: userResponse.picture?.data?.url,
                });
              } else {
                console.log("[FB Auth] No user ID in response");
                onError?.("Failed to get user information from Facebook");
              }
            }
          );
        } else {
          setIsLoading(false);
          console.log("[FB Auth] Login failed or cancelled:", response.status);
          if (response.status === "not_authorized") {
            onError?.("Authorization was cancelled");
          } else {
            onError?.("Login was cancelled or failed");
          }
        }
      },
      { scope: "email,public_profile" }
    );
  }, [disabled, isLoading, onSuccess, onError]);

  if (!appId) {
    console.log("[FB Auth] No App ID configured, not rendering button");
    return null;
  }

  console.log("[FB Auth] Rendering button:", { isSDKLoaded, userInfo, isLoading });

  const buttonText = userInfo
    ? `${userInfo.name.split(" ")[0]}`
    : variant === "register"
    ? "Facebook"
    : variant === "seller"
    ? "Facebook"
    : "Facebook";

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={disabled || isLoading || !isSDKLoaded}
      className={`facebook-auth-btn ${className} ${userInfo ? "has-user" : ""}`}
    >
      {isLoading ? (
        <div className="fb-loading-spinner" />
      ) : userInfo?.picture ? (
        <div className="fb-user-avatar">
          <Image
            src={userInfo.picture}
            alt={userInfo.name}
            width={28}
            height={28}
            className="fb-avatar-img"
          />
        </div>
      ) : (
        <FaFacebookF className="fb-icon" />
      )}
      <span className="fb-text">{buttonText}</span>
    </button>
  );
}
