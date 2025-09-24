"use client";

import { useState, useEffect } from "react";
import "./pwa-install-prompt.css";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent);
    const android = /android/.test(userAgent);

    setIsIOS(iOS);
    setIsAndroid(android);

    // Check if already installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    const isWebKit =
      "standalone" in window.navigator && window.navigator.standalone;

    if (isStandalone || isWebKit) {
      setIsInstalled(true);
      return;
    }

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissal = dismissedDate
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    // Show prompt if not dismissed recently (7 days)
    if (!dismissed || daysSinceDismissal > 7) {
      // For Android devices, wait for beforeinstallprompt event
      if (android) {
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
          e.preventDefault();
          setDeferredPrompt(e);
          setShowInstallPrompt(true);
        };

        window.addEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt
        );

        return () => {
          window.removeEventListener(
            "beforeinstallprompt",
            handleBeforeInstallPrompt
          );
        };
      } else if (iOS) {
        // For iOS, show after a short delay
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      }
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android Chrome
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
          setShowInstallPrompt(false);
          setIsInstalled(true);
        } else {
          handleDismiss();
        }
      } catch (error) {
        console.log("Installation failed:", error);
        setShowInstructions(true);
      }
    } else {
      // iOS or other browsers - show manual instructions
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  const handleCloseInstructions = () => {
    setShowInstructions(false);
    handleDismiss();
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <>
      {/* Install Prompt Banner */}
      <div className="pwa-install-banner">
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon">
            <div className="soulart-logo">
              <div className="logo-circle"></div>
              <div className="logo-brush"></div>
            </div>
          </div>

          <div className="pwa-banner-text">
            <h3>Soulart აპლიკაცია</h3>
            <p>ჩამოტვირთეთ ჩვენი აპლიკაცია უკეთესი გამოცდილებისთვის</p>
          </div>

          <div className="pwa-banner-actions">
            <button className="pwa-install-btn" onClick={handleInstallClick}>
              {isIOS ? "ინსტრუქცია" : "ჩამოტვირთვა"}
            </button>
            <button
              className="pwa-dismiss-btn"
              onClick={handleDismiss}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Installation Instructions Modal */}
      {showInstructions && (
        <div className="pwa-instructions-overlay">
          <div className="pwa-instructions-modal">
            <div className="pwa-modal-header">
              <h2>აპლიკაციის ჩამოტვირთვა</h2>
              <button
                className="pwa-close-btn"
                onClick={handleCloseInstructions}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="pwa-modal-content">
              {isIOS ? (
                <div className="pwa-ios-instructions">
                  <div className="pwa-step">
                    <div className="pwa-step-number">1</div>
                    <div className="pwa-step-content">
                      <p>
                        დააჭირეთ <strong>Share</strong> ღილაკს Safari-ში
                      </p>
                      <div className="pwa-icon-demo safari-share">
                        <div className="share-icon"></div>
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step">
                    <div className="pwa-step-number">2</div>
                    <div className="pwa-step-content">
                      <p>
                        აირჩიეთ <strong>"Add to Home Screen"</strong>
                      </p>
                      <div className="pwa-icon-demo add-home">
                        <div className="add-icon">+</div>
                        <span>Add to Home Screen</span>
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step">
                    <div className="pwa-step-number">3</div>
                    <div className="pwa-step-content">
                      <p>
                        დააჭირეთ <strong>"Add"</strong> დასადასტურებლად
                      </p>
                      <button className="pwa-demo-btn">Add</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pwa-android-instructions">
                  <div className="pwa-step">
                    <div className="pwa-step-number">1</div>
                    <div className="pwa-step-content">
                      <p>გახსენით Chrome ბრაუზერი</p>
                      <div className="pwa-icon-demo chrome">
                        <div className="chrome-icon"></div>
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step">
                    <div className="pwa-step-number">2</div>
                    <div className="pwa-step-content">
                      <p>
                        დააჭირეთ მენიუს (⋮) და აირჩიეთ{" "}
                        <strong>"Add to Home screen"</strong>
                      </p>
                      <div className="pwa-icon-demo menu">
                        <div className="menu-dots">⋮</div>
                      </div>
                    </div>
                  </div>

                  <div className="pwa-step">
                    <div className="pwa-step-number">3</div>
                    <div className="pwa-step-content">
                      <p>დაადასტურეთ ინსტალაცია</p>
                      <button className="pwa-demo-btn">Install</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pwa-benefits">
                <h3>აპლიკაციის უპირატესობები:</h3>
                <ul>
                  <li>✓ სწრაფი ჩატვირთვა</li>
                  <li>✓ ოფლაინ რეჟიმი</li>
                  <li>✓ მთავარ ეკრანზე უშუალო წვდომა</li>
                  <li>✓ მეტი ადგილი ეკრანზე</li>
                  <li>✓ კარგი მობილური გამოცდილება</li>
                </ul>
              </div>
            </div>

            <div className="pwa-modal-footer">
              <button
                className="pwa-got-it-btn"
                onClick={handleCloseInstructions}
              >
                მივხვდი
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
