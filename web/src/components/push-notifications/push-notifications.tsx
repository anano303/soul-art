"use client";

import { useState, useEffect, useCallback } from "react";
import "./push-notifications.css";
import { useUser } from "@/modules/auth/hooks/use-user";
import { trackSubscribedButtonClick } from "@/components/MetaPixel";

interface NotificationState {
  permission: NotificationPermission;
  isSubscribed: boolean;
  showPrompt: boolean;
  isLoading: boolean;
  error: string | null;
}

export function PushNotificationManager() {
  const [state, setState] = useState<NotificationState>({
    permission: "default",
    isSubscribed: false,
    showPrompt: false,
    isLoading: false,
    error: null,
  });

  const { user } = useUser();

  // Browser detection
  const getBrowserInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    return {
      isEdge: userAgent.includes("Edg"),
      isChrome: userAgent.includes("Chrome") && !userAgent.includes("Edg"),
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      ),
      isSafari: userAgent.includes("Safari") && !userAgent.includes("Chrome"),
    };
  }, []);

  // Check Push API support
  const isPushSupported = useCallback(() => {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }, []);

  // Service Worker registration
  const registerServiceWorker = useCallback(async () => {
    if (!isPushSupported()) {
      console.warn("Push notifications not supported");
      return null;
    }

    try {
      let registration = await navigator.serviceWorker.getRegistration();

      if (
        registration &&
        !registration.active?.scriptURL.includes("sw-new.js")
      ) {
        await registration.unregister();
        registration = undefined;
      }

      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw-new.js", {
          scope: "/",
          updateViaCache: "none",
        });
      }

      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      setState((prev) => ({
        ...prev,
        error: "Service Worker registration failed",
      }));
      return null;
    }
  }, [isPushSupported]);

  // Check subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    if (!isPushSupported()) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();

      setState((prev) => ({
        ...prev,
        isSubscribed: !!subscription,
        permission: Notification.permission,
      }));
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }, [isPushSupported]);

  // Enhanced permission request with detailed debugging
  const requestPermission = useCallback(async () => {
    console.log("[Push] 🔔 Starting permission request...");
    console.log("[Push] Current permission:", Notification.permission);

    if (!("Notification" in window)) {
      console.error("[Push] ❌ Notifications API not supported");
      setState((prev) => ({
        ...prev,
        error: "Notifications not supported in this browser",
      }));
      return false;
    }

    if (Notification.permission === "granted") {
      console.log("[Push] ✅ Permission already granted");
      return true;
    }

    if (Notification.permission === "denied") {
      console.log("[Push] 🚫 Permission previously denied");
      setState((prev) => ({
        ...prev,
        error: "Notifications blocked. Enable in browser settings.",
      }));
      return false;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const browserInfo = getBrowserInfo();
      console.log("[Push] 🌐 Browser info:", browserInfo);

      // Enhanced Edge handling
      if (browserInfo.isEdge) {
        console.log("[Push] 🔷 Edge browser detected - showing instructions");
        const confirmed = confirm(
          "Microsoft Edge-ში შეტყობინებების ჩასართავად:\n\n" +
            "1. დაჭირეთ 'OK'\n" +
            "2. გამოჩნდება popup - აირჩიეთ 'Allow'\n" +
            "3. თუ popup არ გამოჩნდება:\n" +
            "   - Settings > Site permissions > Notifications\n" +
            "   - Add > localhost:3000 > Allow\n\n" +
            "გთხოვთ დააჭირეთ OK და მოელოდეთ popup-ს"
        );
        if (!confirmed) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return false;
        }

        // Wait a moment for user to be ready
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("[Push] 📞 Requesting notification permission...");
      const permission =
        (await Notification.requestPermission()) as NotificationPermission;
      const browserPermission =
        Notification.permission as NotificationPermission;

      console.log("[Push] 📋 Permission result:", permission);
      console.log("[Push] 📋 Actual browser permission:", browserPermission);

      const finalPermission =
        browserPermission === "default" ? permission : browserPermission;

      setState((prev) => ({
        ...prev,
        permission: finalPermission,
        isLoading: false,
        showPrompt: finalPermission !== "granted",
        error: null,
      }));

      if (finalPermission === "granted") {
        console.log("[Push] ✅ Permission granted successfully!");
        return true;
      } else if (finalPermission === "denied") {
        console.log("[Push] ❌ Permission denied by user");
        const errorMsg = browserInfo.isEdge
          ? "შეტყობინებები დაბლოკილია Edge-ში. Settings > Site permissions > Notifications-ში ჩართეთ"
          : "შეტყობინებები დაბლოკილია. Browser Settings-ში ჩართეთ notification permissions";

        setState((prev) => ({ ...prev, error: errorMsg }));
        return false;
      } else {
        console.log("[Push] ⏳ Permission request pending or dismissed");
        if (browserInfo.isEdge) {
          setState((prev) => ({
            ...prev,
            error:
              "Edge-მა ვერ დამუშავა permission request. მოკლე პაუზის შემდეგ სცადეთ ისევ ან Settings-ში manually ჩართეთ",
          }));
        }
        return false;
      }
    } catch (error) {
      console.error("[Push] ❌ Permission request failed:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Permission request failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }));
      return false;
    }
  }, [getBrowserInfo]);

  // VAPID key helper
  const urlBase64ToUint8Array = useCallback((base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  // Subscribe to push
  const subscribeUserToPush = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const registration = await registerServiceWorker();
      if (!registration) throw new Error("No service worker");

      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setState((prev) => ({
          ...prev,
          isSubscribed: true,
          isLoading: false,
          showPrompt: false,
        }));
        return true;
      }

      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BMxYbPxp5WvZrF_2XQ4K7BzXu8TeYK5lDrFcH0Prf8J0FFJCNThE-MUHcJ3RnJSDtHzYN4RHjYx1fJyy4kJp0n8";

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/push/subscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription,
            userId: user?._id,
            userEmail: user?.email,
          }),
        }
      );

      if (!response.ok) throw new Error("Server error");

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        showPrompt: false,
        error: null,
      }));

      trackSubscribedButtonClick({
        channel: "push_notifications",
        permission: Notification.permission,
        hasUserAccount: Boolean(user?._id),
      });

      if (Notification.permission === "granted") {
        new Notification("🎉 შეტყობინებები ჩართულია!", {
          body: "ახლა მიიღებთ ახალი პროდუქტებისა და შეთავაზებების შესახებ შეტყობინებებს",
          icon: "/android-icon-192x192.png",
        });
      }

      return true;
    } catch (error) {
      console.error("Subscription failed:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Subscription failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }));
      return false;
    }
  }, [registerServiceWorker, urlBase64ToUint8Array, user]);

  // Handle enable button
  const handleEnable = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (hasPermission) {
      await subscribeUserToPush();
    }
  }, [requestPermission, subscribeUserToPush]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setState((prev) => ({ ...prev, showPrompt: false }));
    localStorage.setItem("push-dismissed", Date.now().toString());
  }, []);

  // Test function (dev only)
  const testNotification = useCallback(async () => {
    if (process.env.NODE_ENV !== "development") return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/push/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?._id }),
        }
      );

      if (response.ok) {
        console.log("Test notification sent");
      }
    } catch (error) {
      console.error("Test failed:", error);
    }
  }, [user]);

  // Initialize component
  useEffect(() => {
    if (!isPushSupported()) return;

    checkSubscriptionStatus();

    const browserInfo = getBrowserInfo();

    if (!state.isSubscribed && Notification.permission === "default") {
      const dismissed = localStorage.getItem("push-dismissed");
      if (
        !dismissed ||
        (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24) > 7
      ) {
        if (browserInfo.isMobile) {
          // Auto-request on mobile after user interaction
          const handleTouch = () => {
            handleEnable();
            document.removeEventListener("touchstart", handleTouch);
          };
          document.addEventListener("touchstart", handleTouch, { once: true });
        } else {
          // Show prompt on desktop after delay
          setTimeout(() => {
            setState((prev) => ({ ...prev, showPrompt: true }));
          }, 2000);
        }
      }
    }
  }, [
    isPushSupported,
    checkSubscriptionStatus,
    getBrowserInfo,
    handleEnable,
    state.isSubscribed,
  ]);

  // Don't render if not supported or conditions not met
  if (!isPushSupported() || state.isSubscribed || !state.showPrompt) {
    return null;
  }

  const browserInfo = getBrowserInfo();

  return (
    <div className="push-notification-overlay">
      <div className="push-notification-popup">
        <div className="push-icon">
          <span>🔔</span>
        </div>

        <div className="push-text">
          <h3>მიიღეთ შეტყობინებები</h3>
          <p>
            მოიღეთ შეტყობინებები ახალი პროდუქტების, ფასდაკლებებისა და შეკვეთის
            სტატუსის შესახებ
          </p>

          <div className="notification-types">
            <div className="notification-type">
              <span className="type-icon">🎨</span>
              <span>ახალი ხელნაკეთი პროდუქტები</span>
            </div>
            <div className="notification-type">
              <span className="type-icon">💰</span>
              <span>ფასდაკლებები და აქციები</span>
            </div>
            <div className="notification-type">
              <span className="type-icon">📦</span>
              <span>შეკვეთის მიწოდების სტატუსი</span>
            </div>
          </div>
        </div>

        {state.error && (
          <div className="push-error">
            <span>⚠️ {state.error}</span>
          </div>
        )}

        <div className="push-actions">
          <button
            className="push-allow-btn"
            onClick={handleEnable}
            disabled={state.isLoading}
          >
            {state.isLoading ? "🔄 იტვირთება..." : "ნების დართვა"}
          </button>

          {process.env.NODE_ENV === "development" && (
            <button
              className="push-test-btn"
              onClick={testNotification}
              title="ტესტი"
            >
              🧪 ტესტი
            </button>
          )}

          {browserInfo.isEdge && (
            <button
              className="push-help-btn"
              onClick={() => {
                alert(
                  "Edge-ში შეტყობინებების ჩართვა:\n\n" +
                    "1. Menu (⋯) > Settings\n" +
                    "2. Site permissions > Notifications\n" +
                    `3. Add > ${window.location.hostname} > Allow`
                );
              }}
              style={{
                fontSize: "12px",
                padding: "4px 8px",
                backgroundColor: "#0078d4",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              📖 Edge დახმარება
            </button>
          )}

          <button className="push-dismiss-btn" onClick={handleDismiss}>
            ❌ დახურვა
          </button>
        </div>
      </div>
    </div>
  );
}
