"use client";

import { useState, useEffect } from "react";
import "./push-notifications.css";
import { useUser } from "@/modules/auth/hooks/use-user";

export function PushNotificationManager() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    // Check current permission status
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // Check if service worker is registered and user is subscribed
    checkSubscriptionStatus();

    // Also show permission prompt if notifications are supported but not requested yet
    // This handles cases where PWA is disabled in development
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => {
        setShowPermissionPrompt(true);
      }, 5000); // Show after 5 seconds instead of 10
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);

        // Only hide permission prompt if user is already subscribed
        if (subscription) {
          setShowPermissionPrompt(false);
        }
        // If not subscribed, let the useEffect handle showing the prompt
      } catch (error) {
        console.error("Error checking subscription status:", error);
      }
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      console.error("This browser does not support notifications");
      alert("თქვენი ბრაუზერი არ მხარს უჭერს შეტყობინებებს");
      return false;
    }

    if (!("serviceWorker" in navigator)) {
      console.error("Service workers are not supported");
      alert(
        "თქვენი ბრაუზერი არ მხარს უჭერს service workers-ს, რომლებიც საჭიროა push შეტყობინებებისთვის"
      );
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        await subscribeUserToPush();
        return true;
      } else if (permission === "denied") {
        alert(
          "შეტყობინებები დაბლოკილია. გთხოვთ, ჩართოთ შეტყობინებები ბრაუზერის პარამეტრებში"
        );
      }

      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      alert("შეცდომა შეტყობინებების ნებართვის მოთხოვნისას");
      return false;
    }
  };

  const subscribeUserToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Generate VAPID key (you'll need to replace this with your actual VAPID public key)
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BMxYbPxp5WvZrF_2XQ4K7BzXu8TeYK5lDrFcH0Prf8J0FFJCNThE-MUHcJ3RnJSDtHzYN4RHjYx1fJyy4kJp0n8";

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to the Nest.js backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/push/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription,
            userId: user?._id,
            userEmail: user?.email,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setIsSubscribed(true);
      setShowPermissionPrompt(false);

      console.log("User subscribed to push notifications");
      alert("✅ წარმატებით გამოიწერეთ შეტყობინებები!");
    } catch (error) {
      console.error("Failed to subscribe user:", error);
      alert("❌ შეცდომა გამოწერისას. გთხოვთ, სცადოთ თავიდან");
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify server to remove subscription
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        setIsSubscribed(false);
        console.log("User unsubscribed from push notifications");
      }
    } catch (error) {
      console.error("Failed to unsubscribe user:", error);
    }
  };

  const handleDismiss = () => {
    setShowPermissionPrompt(false);
    localStorage.setItem("push-notification-dismissed", Date.now().toString());
  };

  const refreshCache = async () => {
    if (!("serviceWorker" in navigator)) return;

    setIsRefreshing(true);
    try {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );

      // Force refresh the page
      window.location.reload();
    } catch (error) {
      console.error("Error clearing cache:", error);
      setIsRefreshing(false);
    }
  };

  if (!showPermissionPrompt || permission === "granted" || isSubscribed) {
    return null;
  }

  return (
    <>
      <div className="push-notification-prompt">
        <div className="push-prompt-content">
          <div className="push-icon">
            <div className="bell-icon">🔔</div>
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

          <div className="push-actions">
            <button className="push-allow-btn" onClick={requestPermission}>
              ნების დართვა
            </button>
            <button
              className="push-refresh-btn"
              onClick={refreshCache}
              disabled={isRefreshing}
              title="ახალი მონაცემების სინქრონიზაცია"
            >
              {isRefreshing ? "🔄" : "🔄"} განახლება
            </button>
            <button className="push-dismiss-btn" onClick={handleDismiss}>
              დახურვა
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
