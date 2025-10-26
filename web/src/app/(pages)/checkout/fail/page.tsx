"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/LanguageContext";
import Link from "next/link";
import "./page.css";

function CheckoutFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams) {
      const orderIdParam = searchParams.get("orderId");
      setOrderId(orderIdParam);
      
      // Notify parent window (if opened in modal/popup)
      if (window.opener || window.parent !== window) {
        try {
          const message = { type: "payment_fail", orderId: orderIdParam };
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
  }, [searchParams]);

  const handleRetryPayment = () => {
    if (orderId) {
      router.push(`/orders/${orderId}`);
    } else {
      router.push("/cart");
    }
  };

  return (
    <div className="checkout-fail-container">
      <div className="fail-card">
        <div className="fail-icon-container">
          <svg
            className="fail-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="fail-title">{t("payment.fail.title")}</h1>

        <p className="fail-description">
          {t("payment.fail.description")}
        </p>

        {orderId && (
          <div className="order-info">
            <p className="order-info-text">
              <span className="order-info-label">{t("payment.fail.orderNumber")}</span>{" "}
              {orderId}
            </p>
          </div>
        )}

        <div className="buttons-container">
          <button onClick={handleRetryPayment} className="btn-primary">
            {t("payment.fail.retry")}
          </button>

          <Link href="/cart" className="btn-secondary">
            {t("payment.fail.backToCart")}
          </Link>

          <Link href="/products" className="btn-secondary">
            {t("payment.fail.viewOtherProducts")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutFailPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div>{t("addresses.loading")}</div>}>
      <CheckoutFailContent />
    </Suspense>
  );
}
