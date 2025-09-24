"use client";

import { useState, useEffect } from "react";
import "./network-status.css";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);

      // Hide the status after 3 seconds when back online
      setTimeout(() => {
        setShowStatus(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    // Set initial status
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Don't show anything if online and status shouldn't be shown
  if (isOnline && !showStatus) {
    return null;
  }

  return (
    <div className={`network-status ${isOnline ? "online" : "offline"}`}>
      <div className="network-status-content">
        <div className="network-icon">
          {isOnline ? (
            <div className="wifi-connected">
              <div className="wifi-bar"></div>
              <div className="wifi-bar"></div>
              <div className="wifi-bar"></div>
            </div>
          ) : (
            <div className="wifi-disconnected">
              <div className="wifi-bar"></div>
              <div className="wifi-bar"></div>
              <div className="wifi-bar"></div>
              <div className="wifi-slash"></div>
            </div>
          )}
        </div>

        <div className="network-message">
          {isOnline ? (
            <>
              <span className="status-text">ინტერნეტ კავშირი აღდგენილია</span>
              <span className="status-sub">ყველაფერი კვლავ მუშაობს</span>
            </>
          ) : (
            <>
              <span className="status-text">ოფლაინ რეჟიმი</span>
              <span className="status-sub">ზოგიერთი ფუნქცია შეზღუდულია</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
