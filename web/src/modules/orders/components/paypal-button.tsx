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
  email?: string;
}

interface PayPalButtonProps {
  orderId: string;
  amount: number;
  currency?: "USD" | "EUR";
  onPaymentSuccess?: () => void;
  showCardButton?: boolean;
  shippingAddress?: ShippingAddress;
}

function PayPalButtonWrapper({
  orderId,
  amount,
  currency = "USD",
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
        currency_code: currency,
      },
    };

    // Add shipping address if provided
    if (shippingAddress) {
      purchaseUnit.shipping = {
        name: {
          full_name: shippingAddress.fullName || "Customer",
        },
        address: {
          address_line_1: shippingAddress.address,
          admin_area_2: shippingAddress.city,
          postal_code: shippingAddress.postalCode || "0000",
          country_code: shippingAddress.country.toUpperCase(),
        },
      };
    }

    // Build order payload with payer info to prefill billing address
    // Using any to bypass PayPal's complex type requirements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderPayload: any = {
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
    };

    // Prefill payer (billing) info from shipping address
    if (shippingAddress) {
      const nameParts = (shippingAddress.fullName || "Customer").split(" ");
      const givenName = nameParts[0] || "Customer";
      const surname = nameParts.slice(1).join(" ") || "";

      orderPayload.payer = {
        name: {
          given_name: givenName,
          surname: surname || givenName,
        },
        address: {
          address_line_1: shippingAddress.address,
          admin_area_2: shippingAddress.city,
          postal_code: shippingAddress.postalCode || "0000",
          country_code: shippingAddress.country.toUpperCase(),
        },
      };

      // Add email if available
      if (shippingAddress.email) {
        orderPayload.payer.email_address = shippingAddress.email;
      }

      // Add phone if available (extract country code from full number)
      if (shippingAddress.phone) {
        const cleanPhone = shippingAddress.phone.replace(/\D/g, "");
        // Extract country code (assumes format like +995... or 995...)
        let countryCode = "1"; // Default to US
        let nationalNumber = cleanPhone;
        
        if (cleanPhone.startsWith("995")) {
          countryCode = "995"; // Georgia
          nationalNumber = cleanPhone.substring(3);
        } else if (cleanPhone.startsWith("1")) {
          countryCode = "1"; // US/Canada
          nationalNumber = cleanPhone.substring(1);
        } else if (cleanPhone.length > 10) {
          // Try to extract country code (1-3 digits)
          countryCode = cleanPhone.substring(0, cleanPhone.length - 10);
          nationalNumber = cleanPhone.substring(cleanPhone.length - 10);
        }

        orderPayload.payer.phone = {
          phone_type: "MOBILE",
          phone_number: {
            country_code: countryCode,
            national_number: nationalNumber,
          },
        };
      }
    }

    return actions.order.create(orderPayload);
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
        currency: props.currency || "USD",
      }}
    >
      <PayPalButtonWrapper {...props} />
    </PayPalScriptProvider>
  );
}
