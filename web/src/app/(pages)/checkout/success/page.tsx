"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import "./page.css";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams) {
      const orderIdParam = searchParams.get("orderId");
      setOrderId(orderIdParam);
      
      // Verify payment status with backend
      if (orderIdParam) {
        const verifyPayment = async () => {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payments/bog/verify/${orderIdParam}`, {
              method: 'POST',
              credentials: 'include',
            });
            const result = await response.json();
            console.log('Payment verification result:', result);
          } catch (error) {
            console.error('Failed to verify payment:', error);
          }
        };
        verifyPayment();
      }
      
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
  }, [searchParams]);

  return (
    <div className="checkout-success-container">
      <div className="heartLast">
        <div className="success-card">
          {/* <Image src="/heartLast.png" alt="heartLogo" className="heartLast" width={500} height={700}/> */}

          <h1 className="success-title">გადახდა წარმატებით დასრულდა!</h1>
          <div className="success-icon-container">
            <div className="success-icon">✓</div>
          </div>

          <p className="success-description"> მადლობა შეძენისთვის ! </p>

          {orderId && (
            <div className="order-info">
              <p className="order-info-text">
                <span className="order-info-label">შეკვეთის ნომერი:</span>{" "}
                {orderId}
              </p>
            </div>
          )}

          <div className="buttons-container">
            <Link href={`/orders/${orderId}`} className="btn-primary">
              შეკვეთის დეტალების ნახვა
            </Link>

            <Link href="/shop" className="btn-secondary">
              სხვა პროდუქტების ნახვა
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
