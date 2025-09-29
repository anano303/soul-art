"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/modules/cart/context/cart-context";
import { LoginForm } from "@/modules/auth/components/login-form";
import { ShippingForm } from "./shipping-form";
import { PaymentForm } from "./payment-form";
import { OrderReview } from "./order-review";
import { useLanguage } from "@/hooks/LanguageContext";
import { useCheckout } from "../context/checkout-context";
import Link from "next/link";

export function UnifiedCheckout() {
  const { user } = useAuth();
  const { items } = useCart();
  const { t } = useLanguage();
  const { paymentMethod, setPaymentMethod } = useCheckout();

  // Initialize payment method to BOG only if not already set
  useEffect(() => {
    if (!paymentMethod) {
      setPaymentMethod("BOG");
    }
  }, [paymentMethod, setPaymentMethod]);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <h2>{t("checkout.emptyCart")}</h2>
        <Link href="/products">{t("checkout.continueShopping")}</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      {/* უკან დაბრუნების ღილაკი */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/cart"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            fontSize: "0.9rem",
          }}
        >
          ← {t("checkout.backToCart")}
        </Link>
      </div>

      {/* ყველა კომპონენტი ერთად, სტეპების გარეშე */}

      {!user && (
        <div style={{ marginBottom: "3rem" }}>
          <div
            style={{
              marginBottom: "1rem",
              padding: "1rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #e9ecef",
            }}
          >
            <h3 style={{ margin: "0", color: "#495057", fontSize: "1.1rem" }}>
              {t("checkout.stepIndicators.authorization.title")}
            </h3>
            <p
              style={{
                margin: "0.5rem 0 0 0",
                color: "#6c757d",
                fontSize: "0.9rem",
              }}
            >
              {t("checkout.stepIndicators.authorization.description")}
            </p>
          </div>
          <LoginForm />
        </div>
      )}

      {user && (
        <>
          <div style={{ marginBottom: "3rem" }}>
            <div
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
              }}
            >
              <h3 style={{ margin: "0", color: "#495057", fontSize: "1.1rem" }}>
                {t("checkout.stepIndicators.shipping.title")}
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: "#6c757d",
                  fontSize: "0.9rem",
                }}
              >
                {t("checkout.stepIndicators.shipping.description")}
              </p>
            </div>
            <ShippingForm />
          </div>

          <div style={{ marginBottom: "3rem" }}>
            <div
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
              }}
            >
              <h3 style={{ margin: "0", color: "#495057", fontSize: "1.1rem" }}>
                {t("checkout.stepIndicators.payment.title")}
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: "#6c757d",
                  fontSize: "0.9rem",
                }}
              >
                {t("checkout.stepIndicators.payment.description")}
              </p>
            </div>
            <PaymentForm />
          </div>

          <div>
            <div
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
              }}
            >
              <h3 style={{ margin: "0", color: "#495057", fontSize: "1.1rem" }}>
                {t("checkout.stepIndicators.review.title")}
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: "#6c757d",
                  fontSize: "0.9rem",
                }}
              >
                {t("checkout.stepIndicators.review.description")}
              </p>
            </div>
            <OrderReview />
          </div>
        </>
      )}
    </div>
  );
}
