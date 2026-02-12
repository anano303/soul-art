"use client";

import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
  FUNDING,
} from "@paypal/react-paypal-js";
import type {
  CreateOrderData,
  CreateOrderActions,
  OnApproveData,
  OnApproveActions,
} from "@paypal/paypal-js";
import { apiClient } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";
import { PaymentResult } from "@/types/shipping";

interface ShippingAddress {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  fullName?: string;
  phone?: string;
}

interface PayPalButtonProps {
  orderId: string;
  amount: number;
  onPaymentSuccess?: () => void;
  showCardButton?: boolean;
  shippingAddress?: ShippingAddress;
}

function PayPalButtonWrapper({
  orderId,
  amount,
  onPaymentSuccess,
  showCardButton = true,
  shippingAddress,
}: PayPalButtonProps) {
  const [{ isPending }] = usePayPalScriptReducer();
  const { toast } = useToast();
  const router = useRouter();

  const handlePaymentSuccess = async (paymentResult: PaymentResult) => {
    try {
      await apiClient.put(`/orders/${orderId}/pay`, paymentResult);
      toast({
        title: "Payment Successful",
        description: "Your order has been paid successfully.",
      });

      if (onPaymentSuccess) {
        onPaymentSuccess();
      } else {
        router.refresh();
      }
    } catch {
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment.",
        variant: "destructive",
      });
    }
  };

  const createOrderHandler = async (
    _data: CreateOrderData,
    actions: CreateOrderActions,
  ): Promise<string> => {
    // Build purchase unit with optional shipping address
    const purchaseUnit: {
      amount: { value: string; currency_code: string };
      shipping?: {
        name: { full_name: string };
        address: {
          address_line_1: string;
          admin_area_2: string;
          postal_code: string;
          country_code: string;
        };
      };
    } = {
      amount: {
        value: amount.toString(),
        currency_code: "USD",
      },
    };

    // Add shipping address if provided (will be used as billing too)
    if (shippingAddress) {
      purchaseUnit.shipping = {
        name: {
          full_name: shippingAddress.fullName || "Customer",
        },
        address: {
          address_line_1: shippingAddress.address,
          admin_area_2: shippingAddress.city,
          postal_code: shippingAddress.postalCode || "0000",
          country_code:
            shippingAddress.country === "საქართველო"
              ? "GE"
              : shippingAddress.country.substring(0, 2).toUpperCase(),
        },
      };
    }

    return actions.order.create({
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
    });
  };

  const onApproveHandler = async (
    _data: OnApproveData,
    actions: OnApproveActions,
  ) => {
    const details = await actions.order?.capture();
    if (!details) {
      throw new Error("Failed to capture order");
    }

    const email_address =
      (details.payment_source?.paypal as { email_address?: string })
        ?.email_address || details.payer?.email_address;
    if (!email_address) {
      throw new Error("Missing payment information");
    }

    const paymentResult: PaymentResult = {
      id: details.id || "",
      status: details.status || "",
      update_time: details.update_time || "",
      email_address,
    };

    handlePaymentSuccess(paymentResult);
  };

  const onErrorHandler = () => {
    toast({
      title: "PayPal Error",
      description: "There was an error with PayPal. Please try again.",
      variant: "destructive",
    });
  };

  if (isPending) {
    return (
      <div className="w-full flex items-center justify-center py-4">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>Loading PayPal...</span>
      </div>
    );
  }

  return (
    <div className="paypal-buttons-container space-y-3">
      {/* PayPal Button */}
      <PayPalButtons
        fundingSource={FUNDING.PAYPAL}
        style={{
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "paypal",
          height: 45,
        }}
        createOrder={createOrderHandler}
        onApprove={onApproveHandler}
        onError={onErrorHandler}
      />

      {/* Card Button - Debit or Credit Card */}
      {showCardButton && (
        <PayPalButtons
          fundingSource={FUNDING.CARD}
          style={{
            layout: "vertical",
            color: "black",
            shape: "rect",
            label: "pay",
            height: 45,
          }}
          createOrder={createOrderHandler}
          onApprove={onApproveHandler}
          onError={onErrorHandler}
        />
      )}
    </div>
  );
}

export function PayPalButton(props: PayPalButtonProps) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: "USD",
      }}
    >
      <PayPalButtonWrapper {...props} />
    </PayPalScriptProvider>
  );
}
