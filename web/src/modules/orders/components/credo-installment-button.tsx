"use client";

import React from "react";
import Image from "next/image";
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
      className="w-full font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        fontFamily: '"FiraGo", "ALK Life", serif',
        fontSize: "18px",
        letterSpacing: "0.5px",
        color: "white",
        backgroundColor: isProcessing ? "#6b7280" : "#0066CC",
        width: "100%",
        padding: "14px 24px",
        border: "none",
        borderRadius: "12px",
        cursor: isProcessing ? "not-allowed" : "pointer",
        transition: "background-color 0.3s, transform 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
      onMouseEnter={(e) => {
        if (!isProcessing) {
          e.currentTarget.style.backgroundColor = "#0052A3";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isProcessing) {
          e.currentTarget.style.backgroundColor = "#0066CC";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Credo და-ყა-ვი Logo */}
      <Image
        src="/dayavi.webp"
        alt="კრედო და-ყა-ვი"
        width={84}
        height={28}
        style={{ height: "28px", width: "auto", objectFit: "contain" }}
      />
      <span className="font-medium">
        {isProcessing ? "იტვირთება..." : "დაყავი 3-4 თვემდე უპროცენტოდ"}
      </span>
    </button>
  );
}
