"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { FaFacebookF, FaTimes } from "react-icons/fa";
import { useFacebookAuth } from "@/modules/auth/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import "./facebook-continue-button.css";

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
      getLoginStatus: (
        callback: (response: FacebookAuthResponse) => void
      ) => void;
      api: (path: string, callback: (response: FacebookUserData) => void) => void;
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

interface FacebookContinueButtonProps {
  onLoginSuccess?: () => void;
  language?: "ge" | "en";
}

export function FacebookContinueButton({
  onLoginSuccess,
  language = "ge",
}: FacebookContinueButtonProps) {
  const { isLoggedIn } = useAuth();
  const { mutate: facebookAuth, isPending } = useFacebookAuth();
  const [mounted, setMounted] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [fbUser, setFbUser] = useState<{
    name: string;
    firstName: string;
    picture?: string;
    userId: string;
    accessToken: string;
  } | null>(null);

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  useEffect(() => {
    setMounted(true);
    // Check if user previously dismissed this
    const wasDismissed = sessionStorage.getItem("fb_continue_dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
    return () => setMounted(false);
  }, []);

  const checkLoginStatus = useCallback(() => {
    if (!window.FB) return;

    window.FB.getLoginStatus((response) => {
      if (response.status === "connected" && response.authResponse) {
        // User is connected to FB, fetch their details
        window.FB.api(
          "/me?fields=id,name,email,picture.width(80).height(80)",
          (userResponse: FacebookUserData) => {
            if (userResponse && userResponse.name) {
              setFbUser({
                name: userResponse.name,
                firstName: userResponse.name.split(" ")[0],
                picture: userResponse.picture?.data?.url,
                userId: userResponse.id,
                accessToken: response.authResponse!.accessToken,
              });
            }
          }
        );
      }
    });
  }, []);

  // Initialize Facebook SDK
  useEffect(() => {
    if (!appId || isLoggedIn || dismissed) return;

    const initFB = () => {
      if (!window.FB) return;
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: "v18.0",
      });
      setIsSDKLoaded(true);
      checkLoginStatus();
    };

    if (window.FB) {
      initFB();
      return;
    }

    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) {
      const checkFB = setInterval(() => {
        if (window.FB) {
          clearInterval(checkFB);
          initFB();
        }
      }, 100);
      return () => clearInterval(checkFB);
    }

    window.fbAsyncInit = function () {
      initFB();
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.FB && !isSDKLoaded) {
          initFB();
        }
      }, 100);
    };
    document.body.appendChild(script);
  }, [appId, isLoggedIn, dismissed, checkLoginStatus, isSDKLoaded]);

  const handleContinue = useCallback(() => {
    if (!fbUser || isLoading || isPending) return;

    setIsLoading(true);

    // Re-fetch fresh token and user data
    window.FB.getLoginStatus((response) => {
      if (response.status === "connected" && response.authResponse) {
        window.FB.api(
          "/me?fields=id,name,email,picture.width(100).height(100)",
          (userResponse: FacebookUserData) => {
            if (userResponse && userResponse.id) {
              facebookAuth(
                {
                  accessToken: response.authResponse!.accessToken,
                  userId: userResponse.id,
                  email: userResponse.email,
                  name: userResponse.name,
                  picture: userResponse.picture?.data?.url,
                },
                {
                  onSuccess: () => {
                    setIsLoading(false);
                    toast({
                      title:
                        language === "ge"
                          ? "წარმატებული ავტორიზაცია"
                          : "Login Successful",
                      description:
                        language === "ge"
                          ? `გამარჯობა, ${userResponse.name}!`
                          : `Welcome back, ${userResponse.name}!`,
                      variant: "default",
                    });
                    onLoginSuccess?.();
                  },
                  onError: (error) => {
                    setIsLoading(false);
                    console.error("Facebook auth error:", error);
                    toast({
                      title:
                        language === "ge"
                          ? "ავტორიზაციის შეცდომა"
                          : "Login Error",
                      description:
                        language === "ge"
                          ? "გთხოვთ სცადოთ ხელახლა"
                          : "Please try again",
                      variant: "destructive",
                    });
                  },
                }
              );
            } else {
              setIsLoading(false);
              setFbUser(null);
            }
          }
        );
      } else {
        setIsLoading(false);
        setFbUser(null);
      }
    });
  }, [fbUser, isLoading, isPending, facebookAuth, language, onLoginSuccess]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("fb_continue_dismissed", "true");
  };

  // Don't render if: not mounted, logged in, no FB user, dismissed, SDK not loaded
  if (!mounted || isLoggedIn || !fbUser || dismissed || !isSDKLoaded) {
    return null;
  }

  const buttonContent = (
    <div className="fb-continue-container">
      <button
        className="fb-continue-button"
        onClick={handleContinue}
        disabled={isLoading || isPending}
      >
        {isLoading || isPending ? (
          <div className="fb-loading-spinner-small" />
        ) : (
          <>
            {fbUser.picture ? (
              <div className="fb-continue-avatar">
                <Image
                  src={fbUser.picture}
                  alt={fbUser.name}
                  width={32}
                  height={32}
                  className="fb-continue-avatar-img"
                />
                <div className="fb-badge">
                  <FaFacebookF />
                </div>
              </div>
            ) : (
              <div className="fb-continue-icon">
                <FaFacebookF />
              </div>
            )}
            <div className="fb-continue-text">
              <span className="fb-continue-label">
                {language === "ge" ? "განაგრძეთ როგორც" : "Continue as"}
              </span>
              <span className="fb-continue-name">{fbUser.firstName}</span>
            </div>
          </>
        )}
      </button>
      <button
        className="fb-continue-close"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <FaTimes />
      </button>
    </div>
  );

  return createPortal(buttonContent, document.body);
}

export default FacebookContinueButton;
