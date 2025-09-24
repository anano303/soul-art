// Service Worker for Push Notifications
// ეს ფაილი თავისთავად იქმნება next-pwa-ს მიერ, მაგრამ ჩვენ ვამატებთ push notification ფუნქციონალს

self.addEventListener("push", function (event) {
  console.log("📥 Push შეტყობინება მიღებულია:", event);

  if (!event.data) {
    console.log("⚠️ Push შეტყობინება ცარიელია");
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (error) {
    console.error("❌ Push შეტყობინების დეკოდირების შეცდომა:", error);
    return;
  }

  const title = notificationData.title || "Soulart";
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || "/android-icon-192x192.png",
    badge: notificationData.badge || "/favicon-96x96.png",
    tag: notificationData.tag || "soulart-notification",
    data: notificationData.data || {},
    requireInteraction: notificationData.requireInteraction || false,
    vibrate: [200, 100, 200], // ვიბრაცია mobile-ზე
    actions: [
      {
        action: "open",
        title: "გახსნა",
        icon: "/android-icon-48x48.png",
      },
      {
        action: "dismiss",
        title: "დახურვა",
        icon: "/ms-icon-70x70.png",
      },
    ],
  };

  // შეტყობინების ტიპის მიხედვით დამატებითი customization
  if (notificationData.data?.type === "new_product") {
    options.badge = "/android-icon-72x72.png";
    options.actions.unshift({
      action: "view_product",
      title: "ნამუშევრის ნახვა",
      icon: "/android-icon-48x48.png",
    });
  }

  if (notificationData.data?.type === "discount") {
    options.badge = "/android-icon-96x96.png";
    options.actions.unshift({
      action: "view_discounts",
      title: "ფასდაკლების ნახვა",
      icon: "/android-icon-48x48.png",
    });
  }

  if (notificationData.data?.type === "order_status") {
    options.badge = "/android-icon-144x144.png";
    options.actions.unshift({
      action: "view_order",
      title: "შეკვეთის ნახვა",
      icon: "/android-icon-48x48.png",
    });
  }

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        console.log("✅ შეტყობინება წარმატებით გამოიტანა");
      })
      .catch((error) => {
        console.error("❌ შეტყობინების გამოტანის შეცდომა:", error);
      })
  );
});

// შეტყობინებაზე კლიკის დამუშავება
self.addEventListener("notificationclick", function (event) {
  console.log("🖱️ შეტყობინებაზე დაკლიკდა:", event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  let url = data.url || "/";

  // Action-ების მიხედვით URL-ების განსაზღვრა
  switch (action) {
    case "view_product":
      url = data.url || "/products";
      break;
    case "view_discounts":
      url = "/products?discount=true";
      break;
    case "view_order":
      url = data.url || "/orders";
      break;
    case "open":
      url = data.url || "/";
      break;
    case "dismiss":
      return; // არაფერი არ გავაკეთოთ
    default:
      url = data.url || "/";
  }

  // ფანჯრის გახსნა ან არსებულზე გადამისამართება
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // თუ უკვე არის გახსნილი ფანჯარა
        if (clientList.length > 0) {
          const client = clientList[0];
          client.navigate(url);
          return client.focus();
        }

        // ახალი ფანჯრის გახსნა
        return clients.openWindow(url);
      })
      .then(() => {
        console.log("✅ ფანჯარა წარმატებით გაიხსნა:", url);
      })
      .catch((error) => {
        console.error("❌ ფანჯრის გახსნის შეცდომა:", error);
      })
  );
});

// Push Subscription-ის შეცვლის დამუშავება
self.addEventListener("pushsubscriptionchange", function (event) {
  console.log("🔄 Push subscription შეიცვალა");

  event.waitUntil(
    // ახალი subscription-ის მიღება
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(
          // ეს VAPID Public Key უნდა იყოს environment variable-დან
          "BCBpbl9qQKkEz-RgSzXbYVQm9EzNzzOWxYNhTNk1c46thJwADHXIv-B2RmZALdT9mmhiBhkw4lhTgY62_W_PDfc"
        ),
      })
      .then(function (newSubscription) {
        console.log("✅ ახალი push subscription მიღებულია");

        // ახალი subscription-ის სერვერზე გაგზავნა
        return fetch("/api/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "subscribe",
            subscription: newSubscription,
          }),
        });
      })
      .catch((error) => {
        console.error("❌ Push subscription განახლების შეცდომა:", error);
      })
  );
});

// VAPID key-ის კონვერტაცია
function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

console.log("🔧 Soulart Push Notification Service Worker ჩაირთო!");
