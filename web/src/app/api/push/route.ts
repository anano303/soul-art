import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

// VAPID Keys - ეს უნდა განისაზღვროს environment variables-ში
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:support@soulart.ge";

// VAPID keys-ის დაყენება
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  data: {
    url?: string;
    type: "new_product" | "discount" | "order_status";
    id?: string;
  };
  tag: string;
  requireInteraction: boolean;
}

// In-memory storage - production-ში უნდა გამოვიყენოთ database
const subscriptions: Map<string, PushSubscription> = new Map();

export async function POST(request: NextRequest) {
  try {
    const { subscription, action } = await request.json();

    if (action === "subscribe") {
      // Subscription-ის შენახვა
      const subscriptionKey = JSON.stringify(subscription);
      subscriptions.set(subscriptionKey, subscription);

      console.log("💫 ახალი push notification subscription დარეგისტრირდა");

      return NextResponse.json({
        success: true,
        message: "თქვენ წარმატებით გამოიწერეთ შეტყობინებები",
      });
    }

    if (action === "unsubscribe") {
      // Subscription-ის წაშლა
      const subscriptionKey = JSON.stringify(subscription);
      subscriptions.delete(subscriptionKey);

      console.log("🚫 Push notification subscription გაუქმდა");

      return NextResponse.json({
        success: true,
        message: "თქვენ წარმატებით გაუქმეთ შეტყობინებები",
      });
    }

    if (action === "send") {
      const { payload, targetType } = await request.json();

      // ყველა subscription-ზე შეტყობინების გაგზავნა
      const results = await sendNotificationToAll(payload);

      return NextResponse.json({
        success: true,
        sent: results.successful,
        failed: results.failed,
        message: `შეტყობინება გაიგზავნა ${results.successful} მომხმარებელზე`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "არასწორი მოქმედება",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Push notification API შეცდომა:", error);
    return NextResponse.json(
      {
        success: false,
        message: "სერვერის შეცდომა",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "stats") {
      return NextResponse.json({
        success: true,
        stats: {
          totalSubscriptions: subscriptions.size,
          vapidConfigured: !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
        },
      });
    }

    if (action === "test") {
      // ტესტური შეტყობინების გაგზავნა
      const testPayload: NotificationPayload = {
        title: "🎨 Soulart - ტესტური შეტყობინება",
        body: "თქვენი push notification-ები მუშაობს!",
        icon: "/android-icon-192x192.png",
        badge: "/favicon-96x96.png",
        data: {
          type: "new_product",
          url: "/",
        },
        tag: "test-notification",
        requireInteraction: false,
      };

      const results = await sendNotificationToAll(testPayload);

      return NextResponse.json({
        success: true,
        message: "ტესტური შეტყობინება გაიგზავნა",
        results,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "არასწორი მოთხოვნა",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Push notification GET API შეცდომა:", error);
    return NextResponse.json(
      {
        success: false,
        message: "სერვერის შეცდომა",
      },
      { status: 500 }
    );
  }
}

async function sendNotificationToAll(payload: NotificationPayload) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
  };

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("❌ VAPID keys არ არის კონფიგურირებული");
    results.errors.push("VAPID keys არ არის კონფიგურირებული");
    return results;
  }

  const promises = Array.from(subscriptions.values()).map(
    async (subscription) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        results.successful++;
        console.log("✅ შეტყობინება წარმატებით გაიგზავნა");
      } catch (error: any) {
        results.failed++;
        const errorMessage = error?.message || "უცნობი შეცდომა";
        results.errors.push(errorMessage);

        console.error("❌ შეტყობინების გაგზავნის შეცდომა:", errorMessage);

        // თუ subscription არავალიდურია, წაშლა
        if (error?.statusCode === 410) {
          const subscriptionKey = JSON.stringify(subscription);
          subscriptions.delete(subscriptionKey);
          console.log("🗑️ არავალიდური subscription წაიშალა");
        }
      }
    }
  );

  await Promise.all(promises);
  return results;
}

// ახალი პროდუქტის შეტყობინება
export async function sendNewProductNotification(product: {
  id: string;
  title: string;
  imageUrl?: string;
}) {
  const payload: NotificationPayload = {
    title: "🎨 ახალი ნამუშევარი Soulart-ზე!",
    body: `იხილეთ ახალი ნამუშევარი: ${product.title}`,
    icon: product.imageUrl || "/android-icon-192x192.png",
    badge: "/favicon-96x96.png",
    data: {
      type: "new_product",
      url: `/products/${product.id}`,
      id: product.id,
    },
    tag: `new-product-${product.id}`,
    requireInteraction: true,
  };

  return await sendNotificationToAll(payload);
}

// ფასდაკლების შეტყობინება
export async function sendDiscountNotification(discount: {
  title: string;
  percentage: number;
  category?: string;
}) {
  const payload: NotificationPayload = {
    title: "💰 ფასდაკლება Soulart-ზე!",
    body: `${discount.percentage}% ფასდაკლება${
      discount.category ? ` - ${discount.category}` : ""
    }`,
    icon: "/android-icon-192x192.png",
    badge: "/favicon-96x96.png",
    data: {
      type: "discount",
      url: "/products",
    },
    tag: "discount-notification",
    requireInteraction: true,
  };

  return await sendNotificationToAll(payload);
}

// შეკვეთის სტატუსის შეტყობინება
export async function sendOrderStatusNotification(order: {
  id: string;
  status: string;
  customerEmail?: string;
}) {
  const statusMessages: { [key: string]: string } = {
    confirmed: "თქვენი შეკვეთა დადასტურდა",
    processing: "თქვენი შეკვეთა მუშავდება",
    shipped: "თქვენი შეკვეთა გაიგზავნა",
    delivered: "თქვენი შეკვეთა მიტანილია",
    cancelled: "თქვენი შეკვეთა გაუქმდა",
  };

  const payload: NotificationPayload = {
    title: "📦 შეკვეთის სტატუსი",
    body:
      statusMessages[order.status] ||
      `თქვენი შეკვეთის სტატუსი: ${order.status}`,
    icon: "/android-icon-192x192.png",
    badge: "/favicon-96x96.png",
    data: {
      type: "order_status",
      url: `/orders/${order.id}`,
      id: order.id,
    },
    tag: `order-${order.id}`,
    requireInteraction: true,
  };

  return await sendNotificationToAll(payload);
}
