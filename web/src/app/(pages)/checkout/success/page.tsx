"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { useCheckout } from "@/modules/checkout/context/checkout-context";
import Link from "next/link";
import "./page.css";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { guestInfo, clearCheckout } = useCheckout();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams) {
      const orderIdParam = searchParams.get("orderId");
      setOrderId(orderIdParam);
      
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
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payments/bog/verify/${orderIdParam}`, {
              method: 'POST',
              credentials: 'include',
            });
          } catch (error) {
            console.error('Failed to verify payment:', error);
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

  return (
    <div className="checkout-success-container">
      <div className="heartLast">
        <div className="success-card">
          {/* <Image src="/heartLast.png" alt="heartLogo" className="heartLast" width={500} height={700}/> */}

          <h1 className="success-title">{t("payment.success.title")}</h1>
          <div className="success-icon-container">
            <div className="success-icon">✓</div>
          </div>

          <p className="success-description">{t("payment.success.thanksForPurchase")}</p>

          {orderId && (
            <div className="order-info">
              <p className="order-info-text">
                <span className="order-info-label">{t("payment.success.orderNumber")}</span>{" "}
                {orderId}
              </p>
            </div>
          )}

          <div className="buttons-container">
            <Link 
              href={`/orders/${orderId}`} 
              className="btn-primary"
            >
              {t("payment.success.viewOrderDetails")}
            </Link>

            <Link href="/shop" className="btn-secondary">
              {t("payment.success.viewOtherProducts")}
            </Link>

            {!user && guestEmail && (
              <div className="guest-account-prompt">
                <p>{t("payment.success.guestPrompt")}</p>
                <Link href={`/register?email=${encodeURIComponent(guestEmail)}`} className="btn-link">
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
