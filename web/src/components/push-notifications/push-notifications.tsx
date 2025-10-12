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
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Check current permission status
    if ("Notification" in window) {
      setPermission(Notification.permission);
      if (process.env.NODE_ENV === "development") {
        console.log("🔔 Notification permission:", Notification.permission);
        console.log("📱 Is mobile device:", isMobile);
      }
    }

    // Check if service worker is registered and user is subscribed
    checkSubscriptionStatus();

    // Mobile-first automatic permission strategy
    if (isMobile && Notification.permission === "default") {
      // Auto-request permission on mobile immediately after user interaction
      const handleFirstUserInteraction = () => {
        autoRequestMobilePermissions();
        // Remove event listeners after first use
        document.removeEventListener("click", handleFirstUserInteraction);
        document.removeEventListener("touch", handleFirstUserInteraction);
        document.removeEventListener("scroll", handleFirstUserInteraction);
      };

      // Wait for any user interaction, then request permissions
      document.addEventListener("click", handleFirstUserInteraction, {
        once: true,
      });
      document.addEventListener("touchstart", handleFirstUserInteraction, {
        once: true,
      });
      document.addEventListener("scroll", handleFirstUserInteraction, {
        once: true,
      });

      // Fallback: auto-request after 3 seconds if no interaction
      setTimeout(() => {
        if (Notification.permission === "default") {
          autoRequestMobilePermissions();
        }
      }, 3000);
    } else {
      // Check if we should show permission prompt for desktop
      const shouldShowPrompt = checkIfShouldShowPrompt();
      if (shouldShowPrompt) {
        setTimeout(() => {
          setShowPermissionPrompt(true);
        }, 1000);
      }
    }
  }, []);

  const checkIfShouldShowPrompt = () => {
    if (!("Notification" in window)) return false;

    // If already granted or denied, don't show
    if (Notification.permission !== "default") return false;

    // Check if user dismissed it recently
    const dismissedAt = localStorage.getItem("push-notification-dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt);
      const now = Date.now();
      const daysSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return false;
      }
    }

    return true;
  };

  const checkSubscriptionStatus = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        // Check if new service worker is already registered
        let registration = await navigator.serviceWorker.getRegistration();

        // Only register if not already registered with the correct file
        if (
          !registration ||
          !registration.active?.scriptURL.includes("sw-new.js")
        ) {
          if (process.env.NODE_ENV === "development") {
            console.log("🔄 Registering new service worker...");
          }

          // Unregister old service worker first if exists
          if (
            registration &&
            !registration.active?.scriptURL.includes("sw-new.js")
          ) {
            await registration.unregister();
            if (process.env.NODE_ENV === "development") {
              console.log("🗑️ Old service worker unregistered");
            }
          }

          registration = await navigator.serviceWorker.register("/sw-new.js", {
            scope: "/",
          });

          if (process.env.NODE_ENV === "development") {
            console.log("✅ New service worker registered:", registration);
          }
        }

        // Wait for service worker to be ready
        const readyRegistration = await navigator.serviceWorker.ready;
        if (process.env.NODE_ENV === "development") {
          console.log("✅ SW Ready:", readyRegistration.active?.scriptURL);
        }

        const subscription =
          await readyRegistration.pushManager.getSubscription();
        if (process.env.NODE_ENV === "development") {
          console.log("📨 Current push subscription:", !!subscription);
        }

        setIsSubscribed(!!subscription);

        // Only hide permission prompt if user is already subscribed
        if (subscription) {
          setShowPermissionPrompt(false);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("❌ Error checking subscription status:", error);
        }
      }
    }
  };

  const autoRequestMobilePermissions = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return false;
    }

    try {
      if (process.env.NODE_ENV === "development") {
        console.log("📱 Auto-requesting mobile push permissions...");
      }

      // Direct permission request without user confirmation on mobile
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Mobile permissions granted, subscribing...");
        }
        await subscribeUserToPush();
        return true;
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log("❌ Mobile permissions denied:", permission);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Mobile permission request failed:", error);
      }
    }

    return false;
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
      // Check if we're in Edge and handle it differently
      const isEdge = navigator.userAgent.indexOf("Edg") > -1;

      if (process.env.NODE_ENV === "development") {
        console.log("🔍 Browser detection - Edge:", isEdge);
        console.log("🔍 Current permission:", Notification.permission);
      }

      // For Edge, try a more direct approach
      if (isEdge && Notification.permission === "default") {
        // Show a more explicit message for Edge users
        const userConfirmed = confirm(
          "თქვენ იყენებთ Microsoft Edge-ს. შეტყობინებების მისაღებად დააჭირეთ 'OK' და შემდეგ 'Allow' ღილაკს popup-ში."
        );

        if (!userConfirmed) {
          return false;
        }
      }

      const permission = await Notification.requestPermission();

      if (process.env.NODE_ENV === "development") {
        console.log("🔔 Permission result:", permission);
      }

      setPermission(permission);

      if (permission === "granted") {
        await subscribeUserToPush();
        return true;
      } else if (permission === "denied") {
        const message = isEdge
          ? "შეტყობინებები დაბლოკილია Edge-ში. გახსენით Edge Settings > Cookies and site permissions > Notifications და დაუშვით localhost-ისთვის"
          : "შეტყობინებები დაბლოკილია. გთხოვთ, ჩართოთ შეტყობინებები ბრაუზერის პარამეტრებში";
        alert(message);
      } else if (permission === "default") {
        alert("გთხოვთ, გამოიყენოთ მეორე ღილაკი notification-ების ჩასართავად");
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
      if (process.env.NODE_ENV === "development") {
        console.log("🔄 Starting push subscription process...");
      }

      // Check if service worker is available
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not supported");
      }

      // Check if service worker is already registered, if not register it
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        if (process.env.NODE_ENV === "development") {
          console.log("📝 Service worker not registered, registering...");
        }
        registration = await navigator.serviceWorker.register("/sw-new.js", {
          scope: "/",
        });
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Service worker registered:", registration);
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.log("📋 Waiting for service worker to be ready...");
      }
      const readyRegistration = await navigator.serviceWorker.ready;
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Service worker ready:", readyRegistration);
      }

      // Generate VAPID key (you'll need to replace this with your actual VAPID public key)
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BMxYbPxp5WvZrF_2XQ4K7BzXu8TeYK5lDrFcH0Prf8J0FFJCNThE-MUHcJ3RnJSDtHzYN4RHjYx1fJyy4kJp0n8";

      if (process.env.NODE_ENV === "development") {
        console.log(
          "🔑 Using VAPID key:",
          vapidPublicKey.substring(0, 20) + "..."
        );
      }

      const subscription = await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      if (process.env.NODE_ENV === "development") {
        console.log("📨 Push subscription created:", subscription);
      }

      // Send subscription to the Nest.js backend
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/push/subscribe`;
      if (process.env.NODE_ENV === "development") {
        console.log("🌐 Sending to API:", apiUrl);
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          userId: user?._id,
          userEmail: user?.email,
        }),
      });

      if (process.env.NODE_ENV === "development") {
        console.log("📡 API response status:", response.status);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const result = await response.json();
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Subscription successful:", result);
      }

      setIsSubscribed(true);
      setShowPermissionPrompt(false);

      alert("✅ წარმატებით გამოიწერეთ შეტყობინებები!");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ Failed to subscribe user:", error);
      }
      alert(
        `❌ შეცდომა გამოწერისას: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const unsubscribe = async () => {
    try {
      // Ensure service worker is registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
      }

      const readyRegistration = await navigator.serviceWorker.ready;
      const subscription =
        await readyRegistration.pushManager.getSubscription();

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
        if (process.env.NODE_ENV === "development") {
          console.log("User unsubscribed from push notifications");
        }
      }
    } catch (error) {
      console.error("Failed to unsubscribe user:", error);
    }
  };

  const handleDismiss = () => {
    setShowPermissionPrompt(false);
    localStorage.setItem("push-notification-dismissed", Date.now().toString());
  };

  const testPushNotification = async () => {
    if (process.env.NODE_ENV === "development") {
      console.log("🧪 Testing push notification...");

      // Check service worker
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        console.log("🔍 SW Registration:", registration);

        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          console.log("📨 Push Subscription:", subscription);

          if (subscription) {
            console.log("📨 Endpoint:", subscription.endpoint);

            // Test notification locally
            const testNotification = new Notification("Test Notification", {
              body: "This is a test push notification",
              icon: "/android-icon-192x192.png",
              tag: "test-notification",
            });

            setTimeout(() => testNotification.close(), 3000);
          } else {
            console.log("❌ No push subscription found");
          }
        } else {
          console.log("❌ No service worker registration found");
        }
      } else {
        console.log("❌ Service Worker not supported");
      }
    }
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
    return null; // Don't show anything when subscribed or permission granted
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
            {process.env.NODE_ENV === "development" && (
              <button
                className="push-test-btn"
                onClick={testPushNotification}
                title="ტესტი push notification"
              >
                🧪 ტესტი
              </button>
            )}
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
