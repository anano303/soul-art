"use client";

import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { useTheme } from "next-themes";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export default function PWAInstallBar() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBar, setShowInstallBar] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Check if app is already installed
    const checkIfStandalone = () => {
      setIsStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
          window.navigator.standalone === true
      );
    };

    // Check if iOS device
    const checkIfIOS = () => {
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    };

    checkIfStandalone();
    checkIfIOS();

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show install bar if not dismissed
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed && !isStandalone) {
        setShowInstallBar(true);
      }
    };

    // Show iOS install instructions if iOS and not standalone
    const showIOSInstructions = () => {
      if (isIOS && !isStandalone) {
        const dismissed = localStorage.getItem("pwa-install-dismissed");
        if (!dismissed) {
          setShowInstallBar(true);
        }
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Delay iOS check to ensure proper detection
    setTimeout(showIOSInstructions, 1000);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [isStandalone, isIOS]);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Show iOS installation instructions
      alert(
        'iOS მოწყობილობაზე დასაყენებლად:\n1. Safari-ში გახსენით soulart.ge\n2. დააჭირეთ Share ღილაკს\n3. აირჩიეთ "Add to Home Screen"'
      );
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
      localStorage.setItem("pwa-installed", "true");
    }

    setDeferredPrompt(null);
    setShowInstallBar(false);
  };

  const handleDismiss = () => {
    setShowInstallBar(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if already installed, dismissed, or no install capability
  if (isStandalone || !showInstallBar || (!deferredPrompt && !isIOS)) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${
        isDark ? "bg-gray-900" : "bg-blue-600"
      } text-white shadow-lg`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  backgroundImage: `url(${
                    isDark
                      ? "/soulart_icon_white_fullsizes.ico"
                      : "/soulart_icon_blue_fullsizes.ico"
                  })`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
                aria-label="SoulArt"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isIOS
                  ? "დაამატეთ SoulArt მთავარ ეკრანზე"
                  : "დააყენეთ SoulArt აპლიკაცია"}
              </p>
              <p className="text-xs opacity-90">
                {isIOS
                  ? "სწრაფი წვდომისთვის Safari-დან გამოიყენეთ Share → Add to Home Screen"
                  : "მიიღეთ სწრაფი წვდომა, push ნოტიფიკაციები და ოფლაინ მუშაობა"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallClick}
              className="bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2"
            >
              {isIOS ? (
                <Share className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{isIOS ? "ინსტრუქცია" : "დაყენება"}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-white hover:text-gray-300 transition-colors p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
