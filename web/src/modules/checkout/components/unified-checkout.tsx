"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/modules/cart/context/cart-context";
import { LoginForm } from "@/modules/auth/components/login-form";
import { ShippingForm } from "./shipping-form";
import { PaymentForm } from "./payment-form";
import { OrderReview } from "./order-review";
import Link from "next/link";
import { useCheckout } from "../context/checkout-context";

export function UnifiedCheckout() {
  const { user } = useAuth();
  const { items } = useCart();
  const { paymentMethod, setPaymentMethod } = useCheckout();

  // Initialize payment method to BOG if not set
  useEffect(() => {
    if (!paymentMethod) {
      setPaymentMethod("BOG");
    }
  }, [paymentMethod, setPaymentMethod]);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <h2>თქვენი კალათა ცარიელია</h2>
        <Link href="/products">განაგრძეთ შოპინგი</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      {/* ყველა კომპონენტი ერთად, სტეპების გარეშე */}

      {!user && (
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
            <h3 style={{ margin: "0", color: "#495057", fontSize: "1.1rem" }}>🔐 ავტორიზაცია</h3>
            <p style={{ margin: "0.5rem 0 0 0", color: "#6c757d", fontSize: "0.9rem" }}>შედით სისტემაში ან დარეგისტრირდით</p>
          </div>
          <LoginForm />
        </div>
      )}

      {user && (
        <>
          <div style={{ marginBottom: "3rem" }}>
            <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
              <h3 style={{ margin: "0", color: "#495057", fontSize: "1.1rem" }}>📍 საფოსტო მისამართი</h3>
              <p style={{ margin: "0.5rem 0 0 0", color: "#6c757d", fontSize: "0.9rem" }}>შეავსეთ თქვენი მისამართი</p>
            </div>
            <ShippingForm />
          </div>

          <div style={{ marginBottom: "3rem" }}>
            <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
              <h3 style={{ margin: "0", color: "#495057", fontSize: "1.1rem" }}>💳 გადახდის მეთოდი</h3>
              <p style={{ margin: "0.5rem 0 0 0", color: "#6c757d", fontSize: "0.9rem" }}>აირჩიეთ გადახდის სისტემა</p>
            </div>
            <PaymentForm />
          </div>

          <div>
            <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
              <h3 style={{ margin: "0", color: "#495057", fontSize: "1.1rem" }}>📋 შეკვეთის შემოწმება</h3>
              <p style={{ margin: "0.5rem 0 0 0", color: "#6c757d", fontSize: "0.9rem" }}>შეამოწმეთ და დაადასტურეთ შეკვეთა</p>
            </div>
            <OrderReview />
          </div>
        </>
      )}
    </div>
  );
}
