"use client";

import { createContext, useContext, useState } from "react";

interface CheckoutContextType {
  shippingAddress: ShippingAddress | null;
  paymentMethod: string | null;
  setShippingAddress: (address: ShippingAddress | null) => void;
  setPaymentMethod: (method: string) => void;
  clearCheckout: () => void;
}

interface ShippingAddress {
  _id?: string;
  label?: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  phoneNumber: string;
  isDefault?: boolean;
}

const CheckoutContext = createContext<CheckoutContextType | null>(null);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [shippingAddress, setShippingAddressState] =
    useState<ShippingAddress | null>(null);
  const [paymentMethod, setPaymentMethodState] = useState<string | null>(null);

  const setShippingAddress = (address: ShippingAddress | null) => {
    setShippingAddressState(address);
  };

  const setPaymentMethod = (method: string) => {
    setPaymentMethodState(method);
  };

  const clearCheckout = () => {
    setShippingAddressState(null);
    setPaymentMethodState(null);
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
