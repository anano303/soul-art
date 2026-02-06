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

  // Fetch user info from Facebook
  const fetchUserInfo = useCallback(() => {
    if (!window.FB) return;

    window.FB.api("/me?fields=id,name,email,picture.width(100).height(100)", (response: FacebookUserData) => {
      if (response && response.name) {
        setUserInfo({
          name: response.name,
          picture: response.picture?.data?.url,
        });
      }
    });
  }, []);

  // Check if user is already logged in with Facebook
  const checkLoginStatus = useCallback(() => {
    if (!window.FB) return;

    window.FB.getLoginStatus((response) => {
      if (response.status === "connected") {
        fetchUserInfo();
      }
    });
  }, [fetchUserInfo]);

  // Initialize Facebook SDK
  useEffect(() => {
    if (!appId) {
      console.warn("Facebook App ID not configured");
      return;
    }

    // Check if SDK is already loaded
    if (window.FB) {
      setIsSDKLoaded(true);
      checkLoginStatus();
      return;
    }

    // Load the SDK asynchronously
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: "v18.0",
      });
      setIsSDKLoaded(true);
      checkLoginStatus();
    };

    // Load SDK script
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup if component unmounts before SDK loads
      const existingScript = document.getElementById("facebook-jssdk");
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [appId, checkLoginStatus]);

  const handleLogin = useCallback(() => {
    if (!window.FB || disabled || isLoading) return;

    setIsLoading(true);

    window.FB.login(
      (response) => {
        if (response.status === "connected" && response.authResponse) {
          // Get user details
          window.FB.api(
            "/me?fields=id,name,email,picture.width(100).height(100)",
            (userResponse: FacebookUserData) => {
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
                onError?.("Failed to get user information from Facebook");
              }
            }
          );
        } else {
          setIsLoading(false);
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
    return null;
  }

  const buttonText = userInfo
    ? `Continue as ${userInfo.name.split(" ")[0]}`
    : variant === "register"
    ? "Sign up with Facebook"
    : variant === "seller"
    ? "Register with Facebook"
    : "Continue with Facebook";

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
