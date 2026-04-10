"use client";

import { useEffect, useCallback } from "react";
import { useUser } from "@/modules/auth/hooks/use-user";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BMxYbPxp5WvZrF_2XQ4K7BzXu8TeYK5lDrFcH0Prf8J0FFJCNThE-MUHcJ3RnJSDtHzYN4RHjYx1fJyy4kJp0n8";

/**
 * Silent push notification manager.
 * Auto-registers SW and subscribes ALL visitors without a custom popup.
 * Native browser permission prompt appears once; if dismissed/denied, retries after 7 days.
 */
export function PushNotificationManager() {
  const { user } = useUser();

  const isPushSupported = useCallback(() => {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }, []);

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

  const sendSubscriptionToServer = useCallback(
    async (subscription: PushSubscription) => {
      await fetch(`${API_URL}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userId: user?._id ?? null,
          userEmail: user?.email ?? null,
        }),
      }).catch(() => {});
    },
    [user],
  );

  const ensureSubscription = useCallback(
    async (registration: ServiceWorkerRegistration) => {
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        // Already subscribed — re-send in case userId changed
        await sendSubscriptionToServer(existing);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });

      await sendSubscriptionToServer(subscription);
    },
    [urlBase64ToUint8Array, sendSubscriptionToServer],
  );

  const ensureServiceWorker =
    useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
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
      } catch {
        return null;
      }
    }, []);

  // Run on mount — request permission & subscribe
  useEffect(() => {
    if (!isPushSupported()) return;

    let cancelled = false;

    const run = async () => {
      try {
        const registration = await ensureServiceWorker();
        if (!registration || cancelled) return;

        // Already granted — just ensure subscription
        if (Notification.permission === "granted") {
          await ensureSubscription(registration);
          return;
        }

        // Denied — nothing we can do
        if (Notification.permission === "denied") return;

        // "default" — show native prompt after delay
        const lastAsked = localStorage.getItem("push-auto-asked");
        if (
          lastAsked &&
          (Date.now() - parseInt(lastAsked)) / (1000 * 60 * 60 * 24) < 7
        ) {
          return;
        }

        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          await ensureSubscription(registration);
        } else {
          localStorage.setItem("push-auto-asked", Date.now().toString());
        }
      } catch (e) {
        console.warn("[Push] auto-subscribe failed:", e);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isPushSupported, ensureServiceWorker, ensureSubscription]);

  // Re-link userId whenever user logs in
  useEffect(() => {
    if (!user?._id || !isPushSupported()) return;
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      await sendSubscriptionToServer(sub);
    });
  }, [user?._id, user?.email, isPushSupported, sendSubscriptionToServer]);

  // No visible UI
  return null;
}
