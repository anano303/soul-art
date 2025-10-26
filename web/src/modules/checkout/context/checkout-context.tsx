"use client";

import { createContext, useContext, useState } from "react";

interface GuestInfo {
  email: string;
  phoneNumber: string;
  fullName: string;
}

interface CheckoutContextType {
  shippingAddress: ShippingAddress | null;
  paymentMethod: string | null;
  guestInfo: GuestInfo | null;
  setShippingAddress: (address: ShippingAddress | null) => void;
  setPaymentMethod: (method: string) => void;
  setGuestInfo: (info: GuestInfo | null) => void;
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
  const [guestInfo, setGuestInfoState] = useState<GuestInfo | null>(null);

  const setShippingAddress = (address: ShippingAddress | null) => {
    setShippingAddressState(address);
  };

  const setPaymentMethod = (method: string) => {
    setPaymentMethodState(method);
  };

  const setGuestInfo = (info: GuestInfo | null) => {
    setGuestInfoState(info);
  };

  const clearCheckout = () => {
    setShippingAddressState(null);
    setPaymentMethodState(null);
    setGuestInfoState(null);
  };

  return (
    <CheckoutContext.Provider
      value={{
        shippingAddress,
        paymentMethod,
        guestInfo,
        setShippingAddress,
        setPaymentMethod,
        setGuestInfo,
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
