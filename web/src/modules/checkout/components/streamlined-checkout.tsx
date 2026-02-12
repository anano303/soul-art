"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/modules/cart/context/cart-context";
import { useCheckout } from "../context/checkout-context";
import { useLanguage } from "@/hooks/LanguageContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/axios";
import { LoginForm } from "@/modules/auth/components/login-form";
import { AddressSelector } from "./address-selector";
import { GuestInfoForm } from "./guest-info-form";
import { Check, AlertTriangle, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import "./streamlined-checkout.css";
import { trackInitiateCheckout, trackPurchase } from "@/components/MetaPixel";
import {
  trackBeginCheckout,
  trackAddShippingInfo,
  trackViewSummary,
  trackClickPurchase,
  trackCheckoutLogin,
} from "@/lib/ga4-analytics";
import { trackCheckoutStart } from "@/hooks/use-sales-tracking";
import Cookies from "js-cookie";
import { CartItem } from "@/types/cart";
import { PayPalButton } from "@/modules/orders/components/paypal-button";
import { useUsdRate } from "@/hooks/useUsdRate";
import { calculateShipping } from "@/lib/shipping";

type CheckoutStep = "auth" | "guest" | "shipping" | "payment" | "review";

interface AuctionCheckoutItem extends CartItem {
  auctionId: string;
  isAuction: true;
}

export function StreamlinedCheckout() {
  const { user } = useAuth();
  const { items, clearCart, clearAuctionItems } = useCart();
  const {
    shippingAddress,
    setShippingAddress,
    setPaymentMethod,
    paymentMethod,
    guestInfo,
    setGuestInfo,
    clearCheckout,
  } = useCheckout();
  const { language, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { usdRate } = useUsdRate();

  // Auction mode state
  const [isAuctionMode, setIsAuctionMode] = useState(false);
  const [auctionItem, setAuctionItem] = useState<AuctionCheckoutItem | null>(
    null,
  );

  const [currentStep, setCurrentStep] = useState<CheckoutStep>("auth");
  const [isValidating, setIsValidating] = useState(false);
  const [unavailableItems, setUnavailableItems] = useState<
    Array<{ productId: string; name: string; reason: string }>
  >([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [paymentWindowClosed, setPaymentWindowClosed] = useState(false);
  const [paymentWindowRef, setPaymentWindowRef] = useState<Window | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);
  const hasTrackedInitiateRef = useRef(false);
  const hasTrackedBeginCheckoutRef = useRef(false);
  const hasTrackedViewSummaryRef = useRef(false);
  const hasTrackedCheckoutLoginRef = useRef(false);
  const previousStepRef = useRef<CheckoutStep | null>(null);
  const [originalPrices, setOriginalPrices] = useState<Record<string, number>>(
    {},
  );
  const [showPayPalButtons, setShowPayPalButtons] = useState(false);

  // Check for auction checkout mode on mount
  useEffect(() => {
    const auctionId = searchParams.get("auction");
    if (auctionId) {
      // Load auction item from sessionStorage
      const storedAuctionItem = sessionStorage.getItem("auction_checkout_item");
      if (storedAuctionItem) {
        try {
          const parsed = JSON.parse(storedAuctionItem);
          if (parsed.auctionId === auctionId) {
            setAuctionItem(parsed);
            setIsAuctionMode(true);
          }
        } catch (e) {
          console.error("Failed to parse auction checkout item:", e);
        }
      }
    }
  }, [searchParams]);

  // Fetch original prices from products API (skip for auction mode)
  useEffect(() => {
    if (isAuctionMode) return;

    const fetchOriginalPrices = async () => {
      const prices: Record<string, number> = {};
      await Promise.all(
        items.map(async (item) => {
          try {
            const response = await apiClient.get(`/products/${item.productId}`);
            prices[item.productId] = response.data.price;
          } catch {
            prices[item.productId] = item.price;
          }
        }),
      );
      setOriginalPrices(prices);
    };
    if (items.length > 0) {
      fetchOriginalPrices();
    }
  }, [items, isAuctionMode]);

  // Get checkout items - either auction item or cart items
  const checkoutItems = isAuctionMode && auctionItem ? [auctionItem] : items;

  // Calculate totals
  const itemsPrice = checkoutItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0,
  );

  // Delivery cost based on country and city
  const shippingCountry = shippingAddress?.country || "GE";
  const shippingPrice = shippingAddress
    ? calculateShipping(shippingCountry, shippingAddress?.city)
    : 0;

  // საკომისიო მოხსნილია - რეალური ფასი ყველგან
  const totalPrice = itemsPrice + shippingPrice;
  const totalUnits = checkoutItems.reduce((acc, item) => acc + item.qty, 0);

  // Calculate total original price and savings
  const totalOriginalPrice = items.reduce(
    (acc, item) =>
      acc + (originalPrices[item.productId] || item.price) * item.qty,
    0,
  );
  const totalSavings = totalOriginalPrice - itemsPrice;

  // Track Step 3: Begin Checkout (once when items exist)
  useEffect(() => {
    if (items.length > 0 && !hasTrackedBeginCheckoutRef.current) {
      const cartItems = items.map((item) => ({
        item_id: item.productId,
        item_name: item.name,
        price: item.price,
        quantity: item.qty,
      }));
      trackBeginCheckout(totalPrice, cartItems);
      // Sales Manager checkout tracking
      trackCheckoutStart();
      hasTrackedBeginCheckoutRef.current = true;
    }
  }, [items, totalPrice]);

  // Fetch saved addresses when user is authenticated
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      try {
        const response = await apiClient.get("/users/me/addresses");
        const addresses = response.data;
        setAddressesLoaded(true);

        // Auto-select default address if exists and no address is currently selected
        const defaultAddress = addresses.find(
          (addr: { isDefault?: boolean }) => addr.isDefault,
        );
        if (defaultAddress && !shippingAddress) {
          setShippingAddress(defaultAddress);
        }
      } catch (error) {
        console.error("Failed to fetch addresses:", error);
        setAddressesLoaded(true);
      }
    };

    if (user && !addressesLoaded) {
      fetchSavedAddresses();
    }
  }, [user, addressesLoaded, shippingAddress, setShippingAddress]);

  // Track Step 4: Add Shipping Info (when address is selected)
  useEffect(() => {
    if (shippingAddress) {
      trackAddShippingInfo();
    }
  }, [shippingAddress]);

  // Auto-advance steps based on state (but not when editing)
  useEffect(() => {
    if (isEditing) return;

    const previousStep = previousStepRef.current;

    // For auction mode, user must be authenticated (they won), skip to shipping
    if (isAuctionMode && user && !shippingAddress) {
      setCurrentStep("shipping");
      return;
    }
    if (isAuctionMode && user && shippingAddress) {
      setCurrentStep("review");
      setPaymentMethod("BOG");
      return;
    }

    if (!user && !isGuestCheckout) {
      setCurrentStep("auth");
    } else if (!user && isGuestCheckout && !guestInfo) {
      setCurrentStep("guest");
    } else if (!addressesLoaded && user) {
      // Wait for addresses to load before deciding
      return;
    } else if (!shippingAddress) {
      // Track Step 4: Checkout Login (when user successfully authenticates during checkout)
      if (
        previousStep === "auth" &&
        user &&
        !hasTrackedCheckoutLoginRef.current
      ) {
        trackCheckoutLogin(false); // false = existing user logging in
        hasTrackedCheckoutLoginRef.current = true;
      }
      setCurrentStep("shipping");
    } else {
      setCurrentStep("review");
      // Auto-set BOG as default payment method
      setPaymentMethod("BOG");
    }

    // Update previous step ref
    previousStepRef.current = currentStep;
  }, [
    user,
    isGuestCheckout,
    guestInfo,
    shippingAddress,
    setPaymentMethod,
    isEditing,
    addressesLoaded,
    currentStep,
    isAuctionMode,
  ]);

  useEffect(() => {
    if (
      currentStep === "review" &&
      totalUnits > 0 &&
      !hasTrackedInitiateRef.current
    ) {
      trackInitiateCheckout(totalPrice, "GEL", totalUnits);
      hasTrackedInitiateRef.current = true;
    }

    // Track Step 5: View Summary (when review step is shown)
    if (currentStep === "review" && !hasTrackedViewSummaryRef.current) {
      trackViewSummary(totalPrice);
      hasTrackedViewSummaryRef.current = true;
    }
  }, [currentStep, totalUnits, totalPrice]);

  // Validate cart items
  const validateCartItems = async () => {
    try {
      const itemsToValidate = items.map((item) => ({
        productId: item.productId,
        quantity: item.qty,
        size: item.size,
        color: item.color,
        ageGroup: item.ageGroup,
      }));

      const response = await apiClient.post("/cart/validate", {
        items: itemsToValidate,
      });

      return response.data;
    } catch (error) {
      console.error("Validation error:", error);
      throw error;
    }
  };

  // Handle auction order placement (won auction checkout)
  const handleAuctionPlaceOrder = async () => {
    if (!auctionItem || !shippingAddress) {
      toast({
        title: t("checkout.error") || "შეცდომა",
        description: t("checkout.missingInfo") || "შეავსეთ მისამართი",
        variant: "destructive",
      });
      return;
    }

    trackClickPurchase(totalPrice);
    setIsProcessingPayment(true);

    try {
      // Determine delivery zone from city
      const city = shippingAddress.city?.toLowerCase() || "";
      const deliveryZone: "TBILISI" | "REGION" =
        city.includes("tbilisi") || city.includes("თბილისი")
          ? "TBILISI"
          : "REGION";

      // Filter shipping address to only include required fields (exclude _id, label, isDefault, etc.)
      const filteredShippingAddress = {
        address: shippingAddress.address,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        phoneNumber: shippingAddress.phoneNumber,
      };

      // Step 1: Initialize BOG payment on auction backend
      const initResponse = await apiClient.post(
        `/auctions/${auctionItem.auctionId}/bog/initialize`,
        {
          deliveryZone,
          shippingAddress: filteredShippingAddress,
        },
      );

      const {
        externalOrderId,
        title,
        artworkPrice,
        deliveryFee,
        totalPayment,
      } = initResponse.data;

      // Step 2: Create BOG payment and get redirect URL
      const bogResponse = await apiClient.post(`/payments/bog/auction/create`, {
        auctionId: auctionItem.auctionId,
        externalOrderId,
        title,
        artworkPrice,
        deliveryFee,
        totalPayment,
      });

      // Step 3: Handle payment redirect
      if (bogResponse.data.redirectUrl) {
        setPaymentUrl(bogResponse.data.redirectUrl);
        setShowPaymentModal(true);
        setPaymentWindowClosed(false);

        // Open payment in new window
        const paymentWindow = window.open(
          bogResponse.data.redirectUrl,
          "BOGPayment",
          "width=600,height=700,scrollbars=yes",
        );

        setPaymentWindowRef(paymentWindow);

        // Check if window was closed
        const checkWindowClosed = setInterval(() => {
          if (paymentWindow && paymentWindow.closed) {
            setPaymentWindowClosed(true);
            clearInterval(checkWindowClosed);
          }
        }, 500);

        // Listen for payment completion via postMessage
        const handlePaymentMessage = (event: MessageEvent) => {
          if (event.data.type === "payment_success") {
            clearAuctionItems();
            clearCheckout();
            setShowPaymentModal(false);
            if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
            window.removeEventListener("message", handlePaymentMessage);
            router.push(`/checkout/success?auctionId=${auctionItem.auctionId}`);
          } else if (event.data.type === "payment_fail") {
            setShowPaymentModal(false);
            if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
            window.removeEventListener("message", handlePaymentMessage);
            router.push(`/checkout/fail?auctionId=${auctionItem.auctionId}`);
          }
        };

        window.addEventListener("message", handlePaymentMessage);

        // Poll auction status as backup
        const pollAuctionStatus = setInterval(async () => {
          try {
            const auctionStatus = await apiClient.get(
              `/auctions/${auctionItem.auctionId}`,
            );
            if (auctionStatus.data.isPaid) {
              clearInterval(pollAuctionStatus);
              clearAuctionItems();
              clearCheckout();
              setShowPaymentModal(false);
              if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
              window.removeEventListener("message", handlePaymentMessage);
              router.push(
                `/checkout/success?auctionId=${auctionItem.auctionId}`,
              );
            }
          } catch {
            // Continue polling
          }
        }, 3000);

        // Stop polling after 10 minutes
        setTimeout(() => clearInterval(pollAuctionStatus), 600000);
      } else {
        throw new Error("No redirect URL received from BOG");
      }
    } catch (error: unknown) {
      console.error("Auction payment error:", error);
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      toast({
        title: t("auctions.paymentError") || "გადახდის შეცდომა",
        description:
          axiosError.response?.data?.message ||
          t("common.tryAgain") ||
          "სცადეთ ხელახლა",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle order placement
  const handlePlaceOrder = async (selectedMethod?: "BOG" | "PAYPAL") => {
    const methodToUse = selectedMethod || paymentMethod;

    // If auction mode, use auction-specific flow
    if (isAuctionMode && auctionItem) {
      return handleAuctionPlaceOrder();
    }

    // Track Step 6: Click Purchase (before creating order)
    trackClickPurchase(totalPrice);

    setIsValidating(true);
    setUnavailableItems([]);

    try {
      // Validate stock first
      const validationResult = await validateCartItems();

      if (!validationResult.isValid) {
        const unavailable = validationResult.unavailableItems.map(
          (item: {
            productId: string;
            reason: string;
            availableQuantity?: number;
          }) => ({
            productId: item.productId,
            name:
              items.find((cartItem) => cartItem.productId === item.productId)
                ?.name || "პროდუქტი",
            reason:
              item.reason === "out_of_stock"
                ? "არ არის მარაგში"
                : item.reason === "not_found"
                  ? "აღარ არსებობს"
                  : item.reason === "insufficient_stock"
                    ? `მარაგში მხოლოდ ${item.availableQuantity} ცალია`
                    : "მიუწვდომელია",
          }),
        );

        setUnavailableItems(unavailable);
        toast({
          title: "შეკვეთის შეცდომა",
          description: "ზოგი პროდუქტი მიუწვდომელია",
          variant: "destructive",
        });
        return;
      }

      // Create order with referral discount info
      const orderItems = items.map((item) => ({
        name: item.name,
        nameEn: item.nameEn,
        qty: item.qty,
        image: item.image,
        price: item.price,
        originalPrice: item.originalPrice,
        productId: item.productId,
        size: item.size,
        color: item.color,
        ageGroup: item.ageGroup,
        // Include referral discount info if present
        referralDiscountPercent: item.referralDiscountPercent || 0,
        referralDiscountAmount: item.referralDiscountAmount || 0,
        hasReferralDiscount: item.hasReferralDiscount || false,
      }));

      // Calculate total referral discount
      const totalReferralDiscount = items.reduce(
        (acc, item) => acc + (item.referralDiscountAmount || 0) * item.qty,
        0,
      );
      const hasReferralDiscount = items.some(
        (item) => item.hasReferralDiscount,
      );

      const orderPayload: {
        orderItems: typeof orderItems;
        shippingDetails: typeof shippingAddress;
        paymentMethod: typeof methodToUse;
        itemsPrice: number;
        taxPrice: number;
        shippingPrice: number;
        totalPrice: number;
        guestInfo?: typeof guestInfo;
        salesRefCode?: string | null;
        totalReferralDiscount?: number;
        hasReferralDiscount?: boolean;
      } = {
        orderItems,
        shippingDetails: shippingAddress,
        paymentMethod: methodToUse,
        itemsPrice,
        taxPrice: 0, // საკომისიო მოხსნილია
        shippingPrice,
        totalPrice, // რეალური ფასი საკომისიოს გარეშე
        salesRefCode: Cookies.get("sales_ref") || null,
        totalReferralDiscount,
        hasReferralDiscount,
      };

      // Add guest info if guest checkout
      if (!user && guestInfo) {
        orderPayload.guestInfo = guestInfo;
      }

      const orderResponse = await apiClient.post("/orders", orderPayload);

      const orderData = orderResponse.data;
      const orderId = orderData._id;
      const orderSummary = {
        orderId,
        totalPrice:
          typeof orderData.totalPrice === "number"
            ? orderData.totalPrice
            : totalPrice,
        currency: orderData.currency || "GEL",
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
          price: item.price,
        })),
      };

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            `order_summary_${orderId}`,
            JSON.stringify(orderSummary),
          );
          localStorage.setItem(
            `order_summary_${orderId}`,
            JSON.stringify(orderSummary),
          );
          sessionStorage.removeItem(`order_summary_${orderId}_tracked`);
          localStorage.removeItem(`order_summary_${orderId}_tracked`);
        } catch (storageError) {
          console.warn(
            "Failed to cache order summary for analytics:",
            storageError,
          );
        }
      }

      // If BOG payment, initiate payment flow
      if (methodToUse === "BOG") {
        await handleBOGPayment(orderId, orderSummary.totalPrice);
      } else if (methodToUse === "PAYPAL") {
        await handlePayPalPayment(orderId);
      } else {
        // For other payment methods, redirect to order page
        try {
          trackPurchase(
            orderSummary.totalPrice,
            orderSummary.currency,
            orderId,
          );
          if (typeof window !== "undefined") {
            sessionStorage.setItem(`order_summary_${orderId}_tracked`, "true");
            localStorage.setItem(`order_summary_${orderId}_tracked`, "true");
          }
        } catch (analyticsError) {
          console.warn("Failed to emit Purchase event:", analyticsError);
        }

        await clearCart();
        clearCheckout();
        router.push(`/orders/${orderId}`);
      }
    } catch (error) {
      console.error("Order error:", error);
      toast({
        title: "შეკვეთის შეცდომა",
        description: "გთხოვთ, სცადოთ ხელახლა",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Handle BOG payment
  const handleBOGPayment = async (orderId: string, amount: number) => {
    setIsProcessingPayment(true);
    setCurrentOrderId(orderId);
    try {
      const paymentData = {
        customer: {
          firstName:
            (guestInfo?.fullName || shippingAddress?.address)?.split(" ")[0] ||
            "Customer",
          lastName:
            (guestInfo?.fullName || shippingAddress?.address)?.split(" ")[1] ||
            "",
          personalId: "000000000",
          address: shippingAddress?.address || "",
          phoneNumber:
            guestInfo?.phoneNumber || shippingAddress?.phoneNumber || "",
          email: guestInfo?.email || user?.email || "",
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

      const response = await apiClient.post(
        "/payments/bog/create",
        paymentData,
      );
      const result = response.data;

      if (result?.redirect_url) {
        setPaymentUrl(result.redirect_url);
        setShowPaymentModal(true);
        setPaymentWindowClosed(false);

        // Open payment in new window
        const paymentWindow = window.open(
          result.redirect_url,
          "BOGPayment",
          "width=600,height=700,scrollbars=yes",
        );

        setPaymentWindowRef(paymentWindow);

        // Check if window was closed
        const checkWindowClosed = setInterval(() => {
          if (paymentWindow && paymentWindow.closed) {
            setPaymentWindowClosed(true);
            clearInterval(checkWindowClosed);
          }
        }, 500);

        // Listen for payment completion via postMessage
        const handlePaymentMessage = (event: MessageEvent) => {
          if (event.data.type === "payment_success") {
            clearCart();
            clearCheckout();
            setShowPaymentModal(false);
            if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
            window.removeEventListener("message", handlePaymentMessage);
            router.push(`/checkout/success?orderId=${orderId}`);
          } else if (event.data.type === "payment_fail") {
            setShowPaymentModal(false);
            if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
            window.removeEventListener("message", handlePaymentMessage);
            router.push(`/checkout/fail?orderId=${orderId}`);
          }
        };

        window.addEventListener("message", handlePaymentMessage);

        // Also poll the order status as backup
        const pollOrderStatus = setInterval(async () => {
          try {
            // Include email parameter for guest orders
            const emailParam =
              !user && guestInfo?.email
                ? `?email=${encodeURIComponent(guestInfo.email)}`
                : "";
            const orderStatus = await apiClient.get(
              `/orders/${orderId}${emailParam}`,
            );
            if (orderStatus.data.isPaid) {
              clearInterval(pollOrderStatus);
              clearCart();
              clearCheckout();
              setShowPaymentModal(false);
              if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
              window.removeEventListener("message", handlePaymentMessage);
              router.push(`/checkout/success?orderId=${orderId}`);
            }
          } catch {
            // Continue polling
          }
        }, 3000);

        // Stop polling after 10 minutes
        setTimeout(() => clearInterval(pollOrderStatus), 600000);
      }
    } catch (error) {
      console.error("BOG Payment Error:", error);
      toast({
        title: "გადახდის შეცდომა",
        description: "გთხოვთ, სცადოთ ხელახლა",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle PayPal payment - Show SDK buttons instead of redirect
  const handlePayPalPayment = async (orderId: string) => {
    setIsProcessingPayment(false);
    setCurrentOrderId(orderId);
    // Show PayPal SDK buttons modal instead of redirect
    setShowPayPalButtons(true);
  };

  // Handle PayPal SDK success - called from PayPalButton component
  const handlePayPalSuccess = async () => {
    setShowPayPalButtons(false);
    await clearCart();
    clearCheckout();
    router.push(`/checkout/success?orderId=${currentOrderId}`);
  };

  // Reopen payment window
  const reopenPaymentWindow = () => {
    if (paymentUrl) {
      const paymentWindow = window.open(
        paymentUrl,
        "BOGPayment",
        "width=600,height=700,scrollbars=yes",
      );
      setPaymentWindowRef(paymentWindow);
      setPaymentWindowClosed(false);

      // Check if window was closed
      const checkWindowClosed = setInterval(() => {
        if (paymentWindow && paymentWindow.closed) {
          setPaymentWindowClosed(true);
          clearInterval(checkWindowClosed);
        }
      }, 500);
    }
  };

  // Cancel order and restore stock
  const handleCancelOrder = async () => {
    if (currentOrderId) {
      try {
        await apiClient.post(`/orders/${currentOrderId}/cancel`, {
          reason: "User closed payment modal without completing payment",
        });
        console.log(`Order ${currentOrderId} cancelled and stock restored`);
      } catch (error) {
        console.error("Error cancelling order:", error);
      }
    }
    setShowPaymentModal(false);
    setCurrentOrderId(null);
    setPaymentUrl("");
    if (paymentWindowRef && !paymentWindowRef.closed) {
      paymentWindowRef.close();
    }
  };

  // Check for empty checkout (no items and not auction mode, or auction mode with no auction item)
  if (
    (!isAuctionMode && items.length === 0) ||
    (isAuctionMode && !auctionItem)
  ) {
    return (
      <div className="empty-cart">
        <h2>{t("checkout.emptyCart")}</h2>
        <Link href={isAuctionMode ? "/auctions" : "/products"}>
          {isAuctionMode
            ? t("auctions.backToAuctions") || "აუქციონებზე დაბრუნება"
            : t("checkout.continueShopping")}
        </Link>
      </div>
    );
  }

  return (
    <div className="streamlined-checkout">
      {/* Auction indicator banner */}
      {isAuctionMode && auctionItem && (
        <div className="auction-checkout-banner">
          <Trophy size={20} />
          <span>{t("auctions.wonAuction") || "მოგებული აუქციონი"}</span>
        </div>
      )}

      {/* Back button */}
      <div className="back-button-wrapper">
        <Link
          href={
            isAuctionMode && auctionItem
              ? `/auctions/${auctionItem.auctionId}`
              : "/cart"
          }
          className="back-button"
        >
          ←{" "}
          {isAuctionMode
            ? t("common.back") || "უკან"
            : t("checkout.backToCart")}
        </Link>
      </div>

      <div className="checkout-container">
        {/* Left Content - Steps */}
        <div className="checkout-content">
          {/* Step Indicator */}
          <div className="step-indicator">
            <div
              className={cn(
                "step",
                (currentStep === "auth" || currentStep === "guest") && "active",
                (user || guestInfo) && "completed",
              )}
            >
              <div className="step-circle">
                {user || guestInfo ? <Check className="w-4 h-4" /> : "1"}
              </div>
              <span className="step-label">
                {t("checkout.steps.authorization")}
              </span>
            </div>
            <div
              className={cn(
                "step",
                currentStep === "shipping" && "active",
                shippingAddress && "completed",
              )}
            >
              <div className="step-circle">
                {shippingAddress ? <Check className="w-4 h-4" /> : "2"}
              </div>
              <span className="step-label">{t("checkout.steps.shipping")}</span>
            </div>
            <div className={cn("step", currentStep === "review" && "active")}>
              <div className="step-circle">3</div>
              <span className="step-label">{t("checkout.steps.order")}</span>
            </div>
          </div>

          {/* Unavailable Items Warning */}
          {unavailableItems.length > 0 && (
            <div className="unavailable-warning">
              <AlertTriangle className="warning-icon" />
              <div>
                <h3>მიუწვდომელი პროდუქტები</h3>
                <ul>
                  {unavailableItems.map((item) => (
                    <li key={item.productId}>
                      <strong>{item.name}</strong> - {item.reason}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push("/cart")}
                  className="btn-secondary"
                >
                  კალათში დაბრუნება
                </button>
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className="step-content">
            {/* Step 1: Authentication */}
            {currentStep === "auth" && !user && (
              <div className="step-section">
                <h2>{t("checkout.stepIndicators.authorization.title")}</h2>
                <p className="step-description">
                  {t("checkout.stepIndicators.authorization.description")}
                </p>
                <LoginForm
                  onLoginSuccess={() => {
                    // Login successful, stay in checkout - step will auto-advance via useEffect
                    // No need to manually change step, the auto-advance logic will handle it
                  }}
                />
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <button
                    onClick={() => {
                      setIsGuestCheckout(true);
                      setCurrentStep("guest");
                    }}
                    className="btn-link"
                    style={{ fontSize: "1rem" }}
                  >
                    {t("checkout.guest.continueAsGuest")}
                  </button>
                </div>
              </div>
            )}

            {/* Step 1b: Guest Info */}
            {currentStep === "guest" && !user && (
              <div className="step-section">
                <GuestInfoForm
                  onContinue={() => {
                    setCurrentStep("shipping");
                  }}
                  onSignIn={() => {
                    setIsGuestCheckout(false);
                    setGuestInfo(null);
                    setCurrentStep("auth");
                  }}
                />
              </div>
            )}

            {/* Step 2: Shipping */}
            {currentStep === "shipping" && (user || guestInfo) && (
              <div className="step-section">
                <h2>{t("checkout.stepIndicators.shipping.title")}</h2>
                <p className="step-description">
                  {t("checkout.stepIndicators.shipping.description")}
                </p>
                <AddressSelector
                  onAddressSelected={(address) => {
                    setShippingAddress(address);
                  }}
                />
              </div>
            )}

            {/* Step 3: Review & Place Order */}
            {currentStep === "review" &&
              (user || guestInfo) &&
              shippingAddress && (
                <div className="step-section">
                  <h2>{t("checkout.stepIndicators.review.title")}</h2>
                  <p className="step-description">
                    {t("checkout.stepIndicators.review.description")}
                  </p>

                  {/* Shipping Address Review */}
                  <div className="review-card">
                    <h3>{t("checkout.shippingAddress")}</h3>
                    <p>
                      {shippingAddress.address}, {shippingAddress.city},{" "}
                      {shippingAddress.postalCode}, {shippingAddress.country}
                    </p>
                    <p>
                      <strong>{t("auth.phoneNumber")}:</strong>{" "}
                      {shippingAddress.phoneNumber}
                    </p>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setCurrentStep("shipping");
                      }}
                      className="btn-link"
                    >
                      შეცვლა
                    </button>
                  </div>

                  {/* Order Items */}
                  <div className="review-card">
                    <h3>
                      {isAuctionMode
                        ? t("auctions.wonAuction") || "მოგებული აუქციონი"
                        : t("payment.orderProducts")}
                    </h3>
                    <div className="order-items-review">
                      {checkoutItems.map((item) => {
                        const displayName =
                          language === "en" && item.nameEn
                            ? item.nameEn
                            : item.name;
                        const itemLink = item.isAuction
                          ? `/auctions/${item.auctionId}`
                          : `/products/${item.productId}`;
                        return (
                          <div
                            key={`${item.productId}-${item.color ?? "c"}-${
                              item.size ?? "s"
                            }-${item.ageGroup ?? "a"}`}
                            className="order-item-row"
                          >
                            <div className="item-image">
                              <Image
                                src={item.image}
                                alt={displayName}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="item-details">
                              <Link href={itemLink} className="item-name">
                                {displayName}
                              </Link>
                              <p className="item-price">
                                {item.qty} x {item.price} ₾ ={" "}
                                {item.qty * item.price} ₾
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Right Sidebar - Order Summary */}
        <div className="order-summary-sidebar">
          <div className="summary-sticky">
            <h3 className="summary-title">
              {isAuctionMode
                ? t("auctions.wonAuction") || "მოგებული აუქციონი"
                : t("payment.orderSummary")}
            </h3>

            <div className="summary-items">
              {checkoutItems.slice(0, 3).map((item) => {
                const displayName =
                  language === "en" && item.nameEn ? item.nameEn : item.name;
                return (
                  <div
                    key={`${item.productId}-${item.color ?? "c"}-${
                      item.size ?? "s"
                    }-${item.ageGroup ?? "a"}`}
                    className="summary-item"
                  >
                    <div className="summary-item-image">
                      <Image
                        src={item.image}
                        alt={displayName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="summary-item-details">
                      <p className="summary-item-name">{displayName}</p>
                      <p className="summary-item-qty">
                        {item.qty} x {item.price} ₾
                      </p>
                    </div>
                    <p className="summary-item-total">
                      {(item.qty * item.price).toFixed(2)} ₾
                    </p>
                  </div>
                );
              })}
              {checkoutItems.length > 3 && (
                <p className="summary-more">
                  + {checkoutItems.length - 3} სხვა პროდუქტი
                </p>
              )}
            </div>

            <div className="summary-divider" />

            <div className="summary-totals">
              <div className="summary-row">
                <span>{t("cart.items")}</span>
                <span>{itemsPrice.toFixed(2)} ₾</span>
              </div>
              <div className="summary-row">
                <span>{t("cart.delivery")}</span>
                <span>
                  {shippingPrice === 0
                    ? t("cart.free")
                    : `${Number(shippingPrice).toFixed(2)} ₾`}
                </span>
              </div>
              {/* თბილისში უფასო მიწოდების შეტყობინება */}
              {shippingPrice > 0 && shippingAddress && (
                <div className="tbilisi-free-note">
                  {t("cart.tbilisiFreeNote")}
                </div>
              )}
              {/* საკომისიო დაკომენტარებულია - ბანკის გვერდზე ნახავს
              <div className="summary-row">
                <span>{t("cart.commission")}</span>
                <span>{taxPrice.toFixed(2)} ₾</span>
              </div>
              */}

              <div className="summary-divider" />

              <div className="summary-row summary-total">
                <span>{t("cart.totalCost")}</span>
                <span className="total-amount">{totalPrice.toFixed(2)} ₾</span>
              </div>

              {/* აუქციონისთვის savings არ ჩანდეს */}
              {!isAuctionMode && totalSavings > 0 && (
                <div className="savings-banner">
                  <span className="savings-icon">✓</span>
                  <span className="savings-text">
                    დაზოგავ: <strong>{totalSavings.toFixed(2)} ₾</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons in Sidebar */}
            {currentStep === "shipping" && shippingAddress && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setCurrentStep("review");
                }}
                className="btn-primary btn-large sidebar-action-btn"
              >
                გაგრძელება
              </button>
            )}

            {currentStep === "review" && (
              <div className="payment-methods-section">
                <h4 className="payment-methods-title">
                  {t("payment.paymentMethod")}
                </h4>

                {/* BOG Payment Option */}
                <button
                  onClick={() => {
                    setPaymentMethod("BOG");
                    handlePlaceOrder("BOG");
                  }}
                  disabled={
                    isValidating ||
                    unavailableItems.length > 0 ||
                    isProcessingPayment
                  }
                  className={`btn-bog-payment sidebar-action-btn mobile-place-order ${paymentMethod === "BOG" ? "selected" : ""}`}
                >
                  <div className="bog-payment-content">
                    <div className="card-icon">
                      <svg
                        width="32"
                        height="24"
                        viewBox="0 0 32 24"
                        fill="none"
                      >
                        <rect
                          x="1"
                          y="1"
                          width="30"
                          height="22"
                          rx="3"
                          stroke="white"
                          strokeWidth="2"
                          fill="rgba(255,255,255,0.2)"
                        />
                        <line
                          x1="1"
                          y1="7"
                          x2="31"
                          y2="7"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <rect
                          x="4"
                          y="14"
                          width="10"
                          height="4"
                          rx="1"
                          fill="white"
                        />
                      </svg>
                    </div>
                    <div className="bog-payment-text">
                      <span className="bog-payment-title">
                        {t("payment.cardPayment")}
                      </span>
                      <span className="bog-payment-subtitle">
                        {t("payment.allCardsAccepted")}
                      </span>
                    </div>
                    {(isValidating || isProcessingPayment) &&
                      paymentMethod === "BOG" && <div className="spinner" />}
                  </div>
                  {!isValidating && !isProcessingPayment && (
                    <span className="bog-payment-amount">
                      {totalPrice.toFixed(2)} ₾
                    </span>
                  )}
                </button>

                {/* PayPal Payment Option */}
                <button
                  onClick={() => {
                    setPaymentMethod("PAYPAL");
                    handlePlaceOrder("PAYPAL");
                  }}
                  disabled={
                    isValidating ||
                    unavailableItems.length > 0 ||
                    isProcessingPayment
                  }
                  className={`btn-paypal-payment sidebar-action-btn ${paymentMethod === "PAYPAL" ? "selected" : ""}`}
                >
                  <div className="paypal-payment-content">
                    <div className="paypal-icon">
                      <svg
                        width="80"
                        height="20"
                        viewBox="0 0 100 26"
                        fill="none"
                      >
                        <path
                          d="M12.237 4.306H6.187c-.417 0-.771.302-.836.71L3.144 20.25c-.05.31.19.59.507.59h2.896c.418 0 .772-.302.837-.71l.595-3.77c.065-.407.42-.71.837-.71h1.929c4.02 0 6.34-1.946 6.943-5.805.272-1.688.011-3.013-.775-3.944-.863-1.022-2.392-1.595-4.676-1.595zm.703 5.72c-.333 2.19-2.004 2.19-3.621 2.19h-.92l.645-4.086c.039-.246.25-.428.5-.428h.422c1.1 0 2.139 0 2.675.627.32.374.418.93.299 1.697z"
                          fill="#253B80"
                        />
                        <path
                          d="M35.654 9.963h-2.907c-.25 0-.46.182-.5.428l-.127.81-.203-.294c-.628-.912-2.028-1.217-3.425-1.217-3.205 0-5.942 2.43-6.475 5.837-.277 1.699.116 3.324 1.08 4.459.884 1.043 2.148 1.477 3.652 1.477 2.583 0 4.015-1.66 4.015-1.66l-.129.805c-.05.31.19.59.507.59h2.62c.418 0 .772-.302.837-.71l1.573-9.935c.05-.31-.19-.59-.518-.59zm-4.043 5.65c-.28 1.657-1.593 2.77-3.275 2.77-.845 0-1.521-.272-1.955-.786-.431-.51-.593-1.238-.458-2.047.26-1.642 1.597-2.79 3.252-2.79.826 0 1.497.274 1.94.791.446.523.622 1.256.496 2.062z"
                          fill="#253B80"
                        />
                        <path
                          d="M55.737 9.963h-2.922c-.28 0-.543.14-.7.373l-4.042 5.954-1.713-5.723c-.107-.358-.436-.604-.81-.604h-2.872c-.352 0-.597.34-.478.668l3.226 9.47-3.034 4.28c-.24.34.01.806.424.806h2.918c.278 0 .538-.136.696-.365l9.742-14.068c.235-.338-.017-.791-.435-.791z"
                          fill="#253B80"
                        />
                        <path
                          d="M67.863 4.306h-6.05c-.417 0-.772.302-.836.71l-2.207 14.234c-.05.31.19.59.506.59h3.095c.292 0 .54-.212.586-.497l.627-3.983c.064-.407.419-.71.836-.71h1.929c4.02 0 6.34-1.946 6.943-5.805.272-1.688.012-3.013-.775-3.944-.863-1.022-2.391-1.595-4.654-1.595zm.703 5.72c-.333 2.19-2.004 2.19-3.62 2.19h-.92l.645-4.086c.039-.246.25-.428.5-.428h.422c1.1 0 2.14 0 2.675.627.32.374.418.93.298 1.697z"
                          fill="#179BD7"
                        />
                        <path
                          d="M91.28 9.963h-2.907c-.25 0-.461.182-.5.428l-.128.81-.202-.294c-.628-.912-2.028-1.217-3.426-1.217-3.204 0-5.941 2.43-6.474 5.837-.277 1.699.116 3.324 1.08 4.459.884 1.043 2.147 1.477 3.651 1.477 2.583 0 4.016-1.66 4.016-1.66l-.13.805c-.05.31.19.59.508.59h2.62c.417 0 .771-.302.836-.71l1.573-9.935c.05-.31-.19-.59-.517-.59zm-4.043 5.65c-.28 1.657-1.593 2.77-3.275 2.77-.845 0-1.52-.272-1.955-.786-.431-.51-.593-1.238-.457-2.047.26-1.642 1.596-2.79 3.252-2.79.825 0 1.496.274 1.94.791.446.523.621 1.256.495 2.062z"
                          fill="#179BD7"
                        />
                        <path
                          d="M94.254 4.72l-2.242 14.27c-.05.31.19.59.507.59h2.502c.418 0 .772-.302.837-.71l2.208-14.234c.05-.31-.19-.59-.507-.59h-2.799c-.25 0-.461.182-.506.428v.246z"
                          fill="#179BD7"
                        />
                      </svg>
                    </div>
                    <div className="paypal-payment-text">
                      <span className="paypal-payment-title">PayPal</span>
                      <span className="paypal-payment-subtitle">
                        {t("payment.paypal.internationalCards")}
                      </span>
                    </div>
                    {(isValidating || isProcessingPayment) &&
                      paymentMethod === "PAYPAL" && <div className="spinner" />}
                  </div>
                  {!isValidating && !isProcessingPayment && (
                    <span className="bog-payment-amount">
                      ${(totalPrice / usdRate).toFixed(2)}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentUrl && (
        <div className="payment-modal-overlay">
          <div className="payment-modal-content">
            <button
              onClick={handleCancelOrder}
              className="payment-modal-close"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="payment-modal-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>

            <h2 className="payment-modal-title">გადახდის დასრულება</h2>

            <p className="payment-modal-description">
              გადახდის გვერდზე შეიყვანეთ ბარათის მონაცემები და დაასრულეთ
              გადახდა.
            </p>

            {paymentWindowClosed && (
              <div className="payment-modal-warning">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>
                  გადახდის ფანჯარა დაიხურა. დააჭირეთ ქვემოთ მის ხელახლა
                  გასახსნელად.
                </span>
              </div>
            )}

            <div className="payment-modal-actions">
              {paymentWindowClosed ? (
                <button
                  onClick={reopenPaymentWindow}
                  className="btn-payment-primary"
                >
                  გადახდის ფანჯრის ხელახლა გახსნა
                </button>
              ) : (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-payment-link"
                  onClick={reopenPaymentWindow}
                >
                  გადახდის გვერდზე გადასვლა
                </a>
              )}
            </div>

            <div className="payment-modal-footer">
              <p className="payment-modal-note">
                💡 გადახდის დასრულების შემდეგ ავტომატურად გადამოგიყვანთ
                დადასტურების გვერდზე
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PayPal SDK Buttons Modal */}
      {showPayPalButtons && currentOrderId && (
        <div className="payment-modal-overlay">
          <div className="payment-modal-content paypal-buttons-modal">
            <button
              className="payment-modal-close"
              onClick={() => setShowPayPalButtons(false)}
            >
              ✕
            </button>

            <div className="payment-modal-header">
              <h2>{t("payment.paypal.title")}</h2>
              <p className="payment-modal-subtitle">
                {t("payment.paypal.subtitle")}
              </p>
            </div>

            <div className="paypal-buttons-wrapper">
              {/* Convert GEL to USD using dynamic rate */}
              <PayPalButton
                orderId={currentOrderId}
                amount={Number((totalPrice / usdRate).toFixed(2))}
                onPaymentSuccess={handlePayPalSuccess}
                showCardButton={true}
                shippingAddress={
                  shippingAddress
                    ? {
                        address: shippingAddress.address,
                        city: shippingAddress.city,
                        postalCode: shippingAddress.postalCode || "",
                        country: shippingAddress.country || "საქართველო",
                        fullName: user?.name || guestInfo?.fullName || "",
                        phone: shippingAddress.phoneNumber || "",
                      }
                    : undefined
                }
              />
              <p className="paypal-conversion-note">
                {totalPrice.toFixed(2)} ₾ ≈ ${(totalPrice / usdRate).toFixed(2)}{" "}
                USD
              </p>
            </div>

            <div className="payment-modal-footer">
              <p className="payment-modal-note">
                🔒 {t("payment.paypal.securePayment")}
              </p>
              <p className="payment-modal-cards">
                {t("payment.paypal.acceptedCards")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
