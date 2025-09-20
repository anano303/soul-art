"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import "./page.css";

function CheckoutFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams) {
      const orderIdParam = searchParams.get("orderId");
      setOrderId(orderIdParam);
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

        <h1 className="fail-title">გადახდა ვერ შესრულდა</h1>

        <p className="fail-description">
          გადახდის პროცესში რაღაც ხარვეზი მოხდა. გთხოვთ სცადოთ ხელახლა ან
          დაგვიკავშირდით მხარდაჭერის სამსახურთან.
        </p>

        {orderId && (
          <div className="order-info">
            <p className="order-info-text">
              <span className="order-info-label">შეკვეთის ნომერი:</span>{" "}
              {orderId}
            </p>
          </div>
        )}

        <div className="buttons-container">
          <button onClick={handleRetryPayment} className="btn-primary">
            ხელახლა ცდა
          </button>

          <Link href="/cart" className="btn-secondary">
            კალათაში დაბრუნება
          </Link>

          <Link href="/products" className="btn-secondary">
            სხვა პროდუქტების ნახვა
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutFailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutFailContent />
    </Suspense>
  );
}
