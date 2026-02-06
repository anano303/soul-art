"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { FaGoogle } from "react-icons/fa";
import "./GoogleAuthPopup.css";

interface GoogleAuthPopupProps {
  onSuccess: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  sellerMode?: boolean;
  className?: string;
}

export function GoogleAuthPopup({
  onSuccess,
  onError,
  disabled = false,
  sellerMode = false,
  className = "",
}: GoogleAuthPopupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledSuccessRef = useRef(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  // Listen for message from popup (postMessage)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      const allowedOrigin = process.env.NEXT_PUBLIC_WEBSITE_URL || window.location.origin;
      if (event.origin !== allowedOrigin) return;

      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        console.log("[Google Auth] Success message received from popup");
        if (!hasCalledSuccessRef.current) {
          hasCalledSuccessRef.current = true;
          setIsLoading(false);
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
          }
          onSuccess();
        }
      } else if (event.data?.type === "GOOGLE_AUTH_ERROR") {
        console.log("[Google Auth] Error message received:", event.data.error);
        setIsLoading(false);
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        onError?.(event.data.error || "Authentication failed");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onError]);

  // Listen for localStorage changes (backup when postMessage fails)
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "google_auth_success" && event.newValue) {
        console.log("[Google Auth] Success detected via localStorage");
        // Clear the flag
        localStorage.removeItem("google_auth_success");
        
        if (!hasCalledSuccessRef.current) {
          hasCalledSuccessRef.current = true;
          setIsLoading(false);
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
          }
          onSuccess();
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [onSuccess]);

  const handleLogin = useCallback(() => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    hasCalledSuccessRef.current = false;
    
    // Clear any previous auth success flag
    localStorage.removeItem("google_auth_success");
    
    console.log("[Google Auth] Opening popup...");

    // Calculate popup position (center of screen)
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authUrl = `${apiUrl}/auth/google?sellerMode=${sellerMode}&popup=true`;
    
    popupRef.current = window.open(
      authUrl,
      "Google Sign In",
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    if (!popupRef.current) {
      setIsLoading(false);
      onError?.("Popup was blocked. Please allow popups for this site.");
      return;
    }

    // Check if popup was closed manually and also check localStorage
    checkIntervalRef.current = setInterval(() => {
      // Check localStorage for auth success (backup method)
      const authSuccess = localStorage.getItem("google_auth_success");
      if (authSuccess && !hasCalledSuccessRef.current) {
        console.log("[Google Auth] Success detected via localStorage polling");
        localStorage.removeItem("google_auth_success");
        hasCalledSuccessRef.current = true;
        setIsLoading(false);
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        onSuccess();
        return;
      }
      
      if (popupRef.current?.closed) {
        console.log("[Google Auth] Popup was closed");
        // Give a brief moment to check if auth succeeded
        setTimeout(() => {
          const authSuccessLate = localStorage.getItem("google_auth_success");
          if (authSuccessLate && !hasCalledSuccessRef.current) {
            localStorage.removeItem("google_auth_success");
            hasCalledSuccessRef.current = true;
            onSuccess();
          }
          setIsLoading(false);
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
          }
        }, 300);
      }
    }, 500);
  }, [apiUrl, disabled, isLoading, onError, onSuccess, sellerMode]);

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={disabled || isLoading}
      className={`google-auth-popup-btn ${className}`}
    >
      {isLoading ? (
        <div className="google-loading-spinner" />
      ) : (
        <FaGoogle className="google-icon" />
      )}
      <span className="google-text">
        <span>G</span>
        <span>o</span>
        <span>o</span>
        <span>g</span>
        <span>l</span>
        <span>e</span>
      </span>
    </button>
  );
}
