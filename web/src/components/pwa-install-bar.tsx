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
      className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md md:max-w-lg shadow-2xl rounded-xl border ${
        isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
      }`}
      style={{
        backdropFilter: "blur(10px)",
        background: isDark
          ? "rgba(31, 41, 55, 0.95)"
          : "rgba(255, 255, 255, 0.95)",
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDark ? "bg-blue-900" : "bg-blue-50"
              }`}
              style={{ backgroundColor: isDark ? "#1e3a8a" : "#eff6ff" }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
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
              <p
                className={`text-sm font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {isIOS
                  ? "📱 დაამატეთ SoulArt მთავარ ეკრანზე"
                  : "🚀 დააყენეთ SoulArt აპლიკაცია"}
              </p>
              <p
                className={`text-xs ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {isIOS
                  ? "Safari-დან გამოიყენეთ Share → 'Add to Home Screen'"
                  : "სწრაფი წვდომა • Push ნოტიფიკაციები • ოფლაინ მუშაობა"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2"
              style={{
                backgroundColor: "#012645",
                color: "white",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#023a6b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#012645";
              }}
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
              className={`transition-colors p-2 rounded-lg ${
                isDark
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
