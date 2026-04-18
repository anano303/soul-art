"use client";

import React from "react";
import { apiClient } from "@/lib/axios";

interface CredoInstallmentButtonProps {
  orderId: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    price: number;
  }>;
}

export function CredoInstallmentButton({
  orderId,
  items,
}: CredoInstallmentButtonProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleCredoInstallment = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      if (!orderId || !items || items.length === 0) {
        throw new Error("Invalid order data");
      }

      const products = items.map((item) => ({
        id: item.productId,
        title: item.name,
        amount: item.qty,
        price: item.price,
      }));

      const response = await apiClient.post(
        "/payments/credo/installment/create",
        {
          orderId,
          products,
        },
      );

      const result = response.data;

      if (result?.success && result?.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        throw new Error("კრედო განვადების ბმული ვერ მოიძებნა");
      }
    } catch (error) {
      console.error("Credo Installment Error:", error);

      let errorMessage = "განვადების მოთხოვნა ვერ მოხერხდა. ";

      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as { response?: { data?: { message?: string } } };
        if (apiError.response?.data?.message) {
          errorMessage += apiError.response.data.message;
        } else {
          errorMessage += "გთხოვთ მოგვიანებით სცადოთ.";
        }
      } else if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += "გთხოვთ მოგვიანებით სცადოთ.";
      }

      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleCredoInstallment}
      disabled={isProcessing}
      style={{
        fontFamily: '"FiraGo", "ALK Life", sans-serif',
        fontSize: "15px",
        color: "white",
        background: isProcessing
          ? "#6b7280"
          : "linear-gradient(135deg, #1e3a5f 0%, #0d47a1 50%, #1565c0 100%)",
        width: "100%",
        padding: "12px 16px",
        border: "none",
        borderRadius: "12px",
        cursor: isProcessing ? "not-allowed" : "pointer",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        flexWrap: "wrap" as const,
        boxShadow: isProcessing ? "none" : "0 2px 8px rgba(13, 71, 161, 0.3)",
        opacity: isProcessing ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isProcessing) {
          e.currentTarget.style.background = "linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #1976d2 100%)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(13, 71, 161, 0.4)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isProcessing) {
          e.currentTarget.style.background = "linear-gradient(135deg, #1e3a5f 0%, #0d47a1 50%, #1565c0 100%)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(13, 71, 161, 0.3)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      <img
        src="/dayavi.webp"
        alt="კრედო და-ყა-ვი"
        style={{ height: "24px", width: "auto", objectFit: "contain", flexShrink: 0 }}
      />
      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
        {isProcessing ? "იტვირთება..." : "განვადება 0%"}
      </span>
    </button>
  );
}
