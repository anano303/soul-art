import React from "react";
import { apiClient } from "@/lib/axios";

interface BOGButtonProps {
  orderId: string;
  amount: number;
}

export function BOGButton({ orderId, amount }: BOGButtonProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleBOGPayment = async () => {
    // Prevent multiple clicks during processing
    if (isProcessing) {
      console.log("Payment already in progress...");
      return;
    }

    setIsProcessing(true);

    try {
      // Validate inputs
      if (!orderId || !amount || amount <= 0) {
        throw new Error("Invalid order data");
      }

      console.log(
        "Starting BOG payment for order:",
        orderId,
        "amount:",
        amount
      );

      // Get order details first with HTTP-only cookie authentication
      const orderResponse = await apiClient.get(`/orders/${orderId}`);

      if (!orderResponse.data) {
        throw new Error("Order not found");
      }

      const order = orderResponse.data;

      // Validate order status
      if (order.status === "PAID") {
        alert("ეს შეკვეთა უკვე გადახდილია");
        setIsProcessing(false);
        return;
      }

      // Create payment request
      const paymentData = {
        customer: {
          firstName: order.shippingAddress?.firstName || "Customer",
          lastName: order.shippingAddress?.lastName || "Customer",
          personalId: order.shippingAddress?.personalId || "000000000",
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

      console.log("Sending payment data:", paymentData);

      const response = await apiClient.post(
        "/payments/bog/create",
        paymentData
      );
      const result = response.data;

      console.log("BOG response:", result);

      if (result?.redirect_url) {
        console.log("Redirecting to BOG:", result.redirect_url);
        window.location.href = result.redirect_url;
      } else {
        throw new Error("No redirect URL provided by BOG");
      }
    } catch (error) {
      console.error("BOG Payment Error:", error);

      // More specific error messages
      let errorMessage = "გადახდა ვერ მოხერხდა. ";

      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as any;
        if (apiError.response?.status === 401) {
          errorMessage += "გთხოვთ ხელახლა შეხვიდეთ სისტემაში.";
        } else if (apiError.response?.status === 404) {
          errorMessage += "შეკვეთა ვერ მოიძებნა.";
        } else if (apiError.response?.data?.message) {
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
      onClick={handleBOGPayment}
      disabled={isProcessing}
      className="w-full hover:bg-gray-50 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-start space-x-3 border border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        fontFamily: '"ALK Life", serif',
        fontSize: "18px",
        letterSpacing: "0.5px",
        color: "black",
        backgroundColor: isProcessing ? "#e9ecef" : "#f8d7da",
        width: "100%",
        padding: "12px 24px",
        border: "1px solid red",
        cursor: isProcessing ? "not-allowed" : "pointer",
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
      <span className="font-medium">
        {isProcessing ? "იტვირთება..." : "გადახდა"}
      </span>
      <span className="font-bold ml-auto"> {amount.toFixed(2)} ₾</span>
    </button>
  );
}
