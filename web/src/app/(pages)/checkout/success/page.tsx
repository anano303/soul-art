"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { useCheckout } from "@/modules/checkout/context/checkout-context";
import Link from "next/link";
import "./page.css";
import { trackPurchase } from "@/components/MetaPixel";
import { trackPurchaseComplete } from "@/lib/ga4-analytics";
import { trackPurchase as trackSalesPurchase } from "@/hooks/use-sales-tracking";

interface StoredOrderSummary {
  orderId: string;
  totalPrice?: number;
  currency?: string;
  items?: Array<{ productId: string; quantity: number; price: number }>;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { guestInfo, clearCheckout } = useCheckout();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<StoredOrderSummary | null>(
    null
  );
  const hasTrackedPurchaseRef = useRef(false);

  useEffect(() => {
    if (searchParams) {
      const orderIdParam = searchParams.get("orderId");
      setOrderId(orderIdParam);

      if (orderIdParam) {
        try {
          const summaryString =
            sessionStorage.getItem(`order_summary_${orderIdParam}`) ||
            localStorage.getItem(`order_summary_${orderIdParam}`);

          if (summaryString) {
            const parsedSummary: StoredOrderSummary = JSON.parse(summaryString);
            if (parsedSummary && typeof parsedSummary.totalPrice === "number") {
              setOrderSummary(parsedSummary);
            }
          }
        } catch (error) {
          console.error("Failed to parse cached order summary:", error);
        }
      }

      // Try multiple sources for guest email
      let email = null;

      // First, try guestInfo from context
      if (guestInfo?.email) {
        email = guestInfo.email;
      }

      // Second, try localStorage
      if (!email && orderIdParam) {
        const storedEmail = localStorage.getItem(`order_${orderIdParam}_email`);
        if (storedEmail) {
          email = storedEmail;
        }
      }

      // Third, try URL parameter (in case it was passed)
      if (!email) {
        const emailParam = searchParams.get("email");
        if (emailParam) {
          email = emailParam;
        }
      }

      if (email) {
        setGuestEmail(email);
        // Always store in localStorage for future access
        if (orderIdParam) {
          localStorage.setItem(`order_${orderIdParam}_email`, email);
        }
      }

      // Verify payment status with backend
      if (orderIdParam) {
        const verifyPayment = async () => {
          try {
            await fetch(
              `${
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
              }/payments/bog/verify/${orderIdParam}`,
              {
                method: "POST",
                credentials: "include",
              }
            );
          } catch (error) {
            console.error("Failed to verify payment:", error);
          }
        };
        verifyPayment();
      }

      // Clear checkout context after successful payment
      clearCheckout();

      // Notify parent window (if opened in modal/popup)
      if (window.opener || window.parent !== window) {
        try {
          const message = { type: "payment_success", orderId: orderIdParam };
          if (window.opener) {
            window.opener.postMessage(message, window.location.origin);
          }
          if (window.parent !== window) {
            window.parent.postMessage(message, window.location.origin);
          }
        } catch (error) {
          console.error("Failed to notify parent window:", error);
        }
      }
    }
  }, [searchParams, guestInfo, clearCheckout]);

  // Sales Manager Purchase tracking - waits for orderSummary to get correct amount
  useEffect(() => {
    if (!orderId) return;

    const salesTracked = sessionStorage.getItem(
      `sales_purchase_tracked_${orderId}`
    );
    if (salesTracked) return;

    // Get order amount - from orderSummary or fetch from API
    const orderAmount = orderSummary?.totalPrice || 0;

    console.log("[SalesPurchaseTrack] Tracking purchase:", {
      orderId,
      orderAmount,
      email: guestEmail || user?.email,
      hasCookie:
        typeof document !== "undefined" &&
        document.cookie.includes("sales_ref"),
    });

    trackSalesPurchase(orderId, orderAmount, guestEmail || user?.email);
    sessionStorage.setItem(`sales_purchase_tracked_${orderId}`, "true");
  }, [orderId, orderSummary, guestEmail, user?.email]);

  useEffect(() => {
    if (!orderId || !orderSummary || hasTrackedPurchaseRef.current) {
      return;
    }

    try {
      const alreadyTracked =
        sessionStorage.getItem(`order_summary_${orderId}_tracked`) === "true" ||
        localStorage.getItem(`order_summary_${orderId}_tracked`) === "true";

      if (alreadyTracked) {
        hasTrackedPurchaseRef.current = true;
        return;
      }

      trackPurchase(
        orderSummary.totalPrice ?? 0,
        orderSummary.currency || "GEL",
        orderId
      );

      // Track in GA4 as well
      trackPurchaseComplete(
        orderId,
        orderSummary.totalPrice ?? 0,
        orderSummary.items || []
      );

      // Track Google Ads purchase conversion (Enhanced)
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "purchase", {
          send_to: "AW-17709570539",
          value: orderSummary.totalPrice ?? 0,
          currency: orderSummary.currency || "GEL",
          transaction_id: orderId,
        });
      }

      hasTrackedPurchaseRef.current = true;

      sessionStorage.setItem(`order_summary_${orderId}_tracked`, "true");
      localStorage.setItem(`order_summary_${orderId}_tracked`, "true");
      sessionStorage.removeItem(`order_summary_${orderId}`);
      localStorage.removeItem(`order_summary_${orderId}`);
    } catch (error) {
      console.error("Failed to emit purchase analytics event:", error);
    }
  }, [orderId, orderSummary]);

  return (
    <div className="checkout-success-container">
      <div className="heartLast">
        <div className="success-card">
          {/* <Image src="/heartLast.png" alt="heartLogo" className="heartLast" width={500} height={700}/> */}

          <h1 className="success-title">{t("payment.success.title")}</h1>
          <div className="success-icon-container">
            <div className="success-icon">✓</div>
          </div>

          <p className="success-description">
            {t("payment.success.thanksForPurchase")}
          </p>

          {orderId && (
            <div className="order-info">
              <p className="order-info-text">
                <span className="order-info-label">
                  {t("payment.success.orderNumber")}
                </span>{" "}
                {orderId}
              </p>
            </div>
          )}

          <div className="buttons-container">
            <Link href={`/orders/${orderId}`} className="btn-primary">
              {t("payment.success.viewOrderDetails")}
            </Link>

            <Link href="/shop" className="btn-secondary">
              {t("payment.success.viewOtherProducts")}
            </Link>

            {!user && guestEmail && (
              <div className="guest-account-prompt">
                <p>{t("payment.success.guestPrompt")}</p>
                <Link
                  href={`/register?email=${encodeURIComponent(guestEmail)}`}
                  className="btn-link"
                >
                  {t("payment.success.createAccount")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div>{t("addresses.loading")}</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
