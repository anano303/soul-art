"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface CheckoutContextType {
  shippingAddress: ShippingAddress | null;
  paymentMethod: string | null;
  setShippingAddress: (address: ShippingAddress) => void;
  setPaymentMethod: (method: string) => void;
  clearCheckout: () => void;
}

interface ShippingAddress {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
}

const CheckoutContext = createContext<CheckoutContextType | null>(null);

const STORAGE_KEYS = {
  SHIPPING_ADDRESS: "checkout_shipping_address",
  PAYMENT_METHOD: "checkout_payment_method",
};

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [shippingAddress, setShippingAddressState] =
    useState<ShippingAddress | null>(null);
  const [paymentMethod, setPaymentMethodState] = useState<string | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedShippingAddress = localStorage.getItem(
      STORAGE_KEYS.SHIPPING_ADDRESS
    );
    const savedPaymentMethod = localStorage.getItem(
      STORAGE_KEYS.PAYMENT_METHOD
    );

    console.log("Loading from localStorage:", {
      savedShippingAddress,
      savedPaymentMethod,
    });

    if (savedShippingAddress) {
      try {
        const parsed = JSON.parse(savedShippingAddress);
        console.log("Parsed shipping address:", parsed);
        setShippingAddressState(parsed);
      } catch (error) {
        console.error("Error parsing saved shipping address:", error);
      }
    }

    if (savedPaymentMethod) {
      console.log("Setting payment method:", savedPaymentMethod);
      setPaymentMethodState(savedPaymentMethod);
    }
  }, []);

  const setShippingAddress = (address: ShippingAddress) => {
    setShippingAddressState(address);
    localStorage.setItem(
      STORAGE_KEYS.SHIPPING_ADDRESS,
      JSON.stringify(address)
    );
  };

  const setPaymentMethod = (method: string) => {
    setPaymentMethodState(method);
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHOD, method);
  };

  const clearCheckout = () => {
    setShippingAddressState(null);
    setPaymentMethodState(null);
    localStorage.removeItem(STORAGE_KEYS.SHIPPING_ADDRESS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_METHOD);
  };

  return (
    <CheckoutContext.Provider
      value={{
        shippingAddress,
        paymentMethod,
        setShippingAddress,
        setPaymentMethod,
        clearCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
}
