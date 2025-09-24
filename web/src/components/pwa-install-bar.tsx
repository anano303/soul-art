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
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md md:max-w-lg rounded-2xl border-0"
      style={{
        background: isDark 
          ? "linear-gradient(135deg, rgba(1, 38, 69, 0.95) 0%, rgba(1, 79, 134, 0.95) 100%)"
          : "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)",
        backdropFilter: "blur(20px)",
        boxShadow: isDark
          ? "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
          : "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(1, 38, 69, 0.1)"
      }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: isDark 
                  ? "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)"
                  : "linear-gradient(135deg, rgba(1, 38, 69, 0.1) 0%, rgba(1, 79, 134, 0.05) 100%)",
                border: `1.5px solid ${isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(1, 38, 69, 0.2)"}`,
                boxShadow: isDark 
                  ? "inset 0 2px 4px rgba(255, 255, 255, 0.1)"
                  : "inset 0 2px 4px rgba(1, 38, 69, 0.1)"
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundImage: `url(${
                    isDark
                      ? "/soulart_icon_white_fullsizes.ico"
                      : "/soulart_icon_blue_fullsizes.ico"
                  })`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  filter: isDark ? "drop-shadow(0 2px 4px rgba(255, 255, 255, 0.1))" : "drop-shadow(0 2px 4px rgba(1, 38, 69, 0.2))"
                }}
                aria-label="SoulArt"
              />
            </div>
            <div className="flex-1">
              <p
                className={`text-sm font-bold tracking-wide ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
                style={{
                  background: isDark 
                    ? "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)"
                    : "linear-gradient(135deg, #012645 0%, #014f86 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: isDark ? "transparent" : "transparent",
                  color: isDark ? "#ffffff" : "#012645"
                }}
              >
                {isIOS
                  ? "📱 დაამატეთ SoulArt-ი მთავარ ეკრანზე"
                  : "🎨 დააყენეთ SoulArt აპლიკაცია"}
              </p>
              <p
                className={`text-xs mt-1 ${
                  isDark ? "text-blue-200" : "text-blue-700"
                }`}
                style={{
                  fontWeight: "500",
                  lineHeight: "1.4"
                }}
              >
                {isIOS
                  ? "Safari → Share ღილაკი → 'Add to Home Screen'"
                  : "⚡ სწრაფი წვდომა • 📢 Push ნოტიფიკაციები • 📱 ოფლაინ მუშაობა"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleInstallClick}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center space-x-2 transform hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #012645 0%, #014f86 100%)",
                color: "white",
                boxShadow: "0 8px 25px rgba(1, 38, 69, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #023a6b 0%, #0369a1 100%)";
                e.currentTarget.style.boxShadow = "0 12px 35px rgba(1, 38, 69, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #012645 0%, #014f86 100%)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(1, 38, 69, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
              }}
            >
              {isIOS ? (
                <Share className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{isIOS ? "ნახვა" : "დაყენება"}</span>
            </button>
            <button
              onClick={handleDismiss}
              className={`transition-all duration-300 p-2.5 rounded-xl hover:scale-110 active:scale-95 ${
                isDark
                  ? "text-gray-300 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
