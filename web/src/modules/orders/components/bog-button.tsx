import React from "react";
import { getAccessToken } from "@/lib/auth";

interface BOGButtonProps {
  orderId: string;
  amount: number;
}

export function BOGButton({ orderId, amount }: BOGButtonProps) {
  const handleBOGPayment = async () => {
    try {
      const token = getAccessToken();

      // Get order details first with authentication
      const orderResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!orderResponse.ok) {
        throw new Error(`Failed to fetch order: ${orderResponse.status}`);
      }

      const order = await orderResponse.json();

      // Create payment request
      const paymentData = {
        customer: {
          firstName: order.shippingAddress?.firstName || "Customer",
          lastName: order.shippingAddress?.lastName || "Customer",
          personalId: order.shippingAddress?.personalId || "",
          address: order.shippingAddress?.address || "",
          phoneNumber: order.shippingAddress?.phone || "",
          email: order.user?.email || "",
        },
        product: {
          productName: `Order #${orderId}`,
          productId: orderId,
          unitPrice: amount,
          quantity: 1,
          totalPrice: amount,
        },
        successUrl: `${window.location.origin}/checkout/success?orderId=${orderId}`,
        failUrl: `${window.location.origin}/checkout/fail?orderId=${orderId}`,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/bog/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(paymentData),
        }
      );

      if (!response.ok) {
        throw new Error("Payment initiation failed");
      }

      const result = await response.json();

      if (result.redirect_url) {
        window.location.href = result.redirect_url;
      } else {
        throw new Error("No redirect URL provided");
      }
    } catch (error) {
      console.error("BOG Payment Error:", error);
      alert("Payment failed. Please try again.");
    }
  };

  return (
    <button
      onClick={handleBOGPayment}
      className="w-full hover:bg-gray-50 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-start space-x-3 border border-gray-200 hover:border-gray-300"
      style={{
        fontFamily: '"ALK Life", serif',
        fontSize: "18px",
        letterSpacing: "0.5px",
        color: "black",
        backgroundColor: " #f8d7da",
        width: "100%",
        padding: "12px 24px",
        border: "1px solid red",
        cursor: "pointer",
        transition: "background-color 0.3s, border-color 0.3s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="black"
        width={20}
        height={20}
        color="green"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
      <span className="font-medium"> გადახდა</span>
      <span className="font-bold ml-auto"> {amount.toFixed(2)} ₾</span>
    </button>
  );
}
