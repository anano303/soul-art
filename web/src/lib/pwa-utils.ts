// PWA utility functions

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export const isPWAInstalled = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
};

export const isIOSDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroidDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  return /Android/.test(navigator.userAgent);
};

export const canInstallPWA = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

export const requestNotificationPermission =
  async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  };

export const showNotification = (
  title: string,
  options?: NotificationOptions
): void => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    const defaultOptions: NotificationOptions = {
      icon: "/soulart_icon_blue_fullsizes.ico",
      badge: "/soulart_icon_blue_fullsizes.ico",
      ...options,
    };

    // Add vibration for mobile devices
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    new Notification(title, defaultOptions);
  }
};

export const registerSW =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New content is available
              showNotification("SoulArt განახლება", {
                body: "ახალი ვერსია ხელმისაწვდომია. განაახლეთ გვერდი.",
                tag: "update-available",
              });
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error("SW registration failed:", error);
      return null;
    }
  };

export const unregisterSW = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return await registration.unregister();
    }
    return false;
  } catch (error) {
    console.error("SW unregistration failed:", error);
    return false;
  }
};

export const getCachedData = async (key: string): Promise<unknown> => {
  if (typeof window === "undefined" || !("caches" in window)) {
    return null;
  }

  try {
    const cache = await caches.open("soulart-v1");
    const response = await cache.match(key);
    if (response) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Failed to get cached data:", error);
    return null;
  }
};

export const setCachedData = async (
  key: string,
  data: unknown
): Promise<boolean> => {
  if (typeof window === "undefined" || !("caches" in window)) {
    return false;
  }

  try {
    const cache = await caches.open("soulart-v1");
    const response = new Response(JSON.stringify(data));
    await cache.put(key, response);
    return true;
  } catch (error) {
    console.error("Failed to cache data:", error);
    return false;
  }
};
