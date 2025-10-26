"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/modules/cart/context/cart-context";
import { useCheckout } from "../context/checkout-context";
import { useLanguage } from "@/hooks/LanguageContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/axios";
import { TAX_RATE } from "@/config/constants";
import { LoginForm } from "@/modules/auth/components/login-form";
import { AddressSelector } from "./address-selector";
import { Check, AlertTriangle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import "./streamlined-checkout.css";

type CheckoutStep = "auth" | "shipping" | "payment" | "review";

export function StreamlinedCheckout() {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { shippingAddress, setShippingAddress, setPaymentMethod, paymentMethod, clearCheckout } =
    useCheckout();
  const { language, t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();

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

  // Calculate totals
  const itemsPrice = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shippingPrice = itemsPrice > 100 ? 0 : 0;
  const taxPrice = Number((itemsPrice * TAX_RATE).toFixed(2));
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  // Fetch saved addresses when user is authenticated
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      try {
        const response = await apiClient.get("/users/me/addresses");
        const addresses = response.data;
        setAddressesLoaded(true);

        // Auto-select default address if exists and no address is currently selected
        const defaultAddress = addresses.find((addr: { isDefault?: boolean }) => addr.isDefault);
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

  // Auto-advance steps based on state (but not when editing)
  useEffect(() => {
    if (isEditing) return;
    
    if (!user) {
      setCurrentStep("auth");
    } else if (!addressesLoaded) {
      // Wait for addresses to load before deciding
      return;
    } else if (!shippingAddress) {
      setCurrentStep("shipping");
    } else {
      setCurrentStep("review");
      // Auto-set BOG as default payment method
      setPaymentMethod("BOG");
    }
  }, [user, shippingAddress, setPaymentMethod, isEditing, addressesLoaded]);

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

  // Handle order placement
  const handlePlaceOrder = async () => {
    setIsValidating(true);
    setUnavailableItems([]);

    try {
      // Validate stock first
      const validationResult = await validateCartItems();

      if (!validationResult.isValid) {
        const unavailable = validationResult.unavailableItems.map((item: {
          productId: string;
          reason: string;
          availableQuantity?: number;
        }) => ({
          productId: item.productId,
          name:
            items.find((cartItem) => cartItem.productId === item.productId)?.name ||
            "პროდუქტი",
          reason:
            item.reason === "out_of_stock"
              ? "არ არის მარაგში"
              : item.reason === "not_found"
              ? "აღარ არსებობს"
              : item.reason === "insufficient_stock"
              ? `მარაგში მხოლოდ ${item.availableQuantity} ცალია`
              : "მიუწვდომელია",
        }));

        setUnavailableItems(unavailable);
        toast({
          title: "შეკვეთის შეცდომა",
          description: "ზოგი პროდუქტი მიუწვდომელია",
          variant: "destructive",
        });
        return;
      }

      // Create order
      const orderItems = items.map((item) => ({
        name: item.name,
        nameEn: item.nameEn,
        qty: item.qty,
        image: item.image,
        price: item.price,
        productId: item.productId,
        size: item.size,
        color: item.color,
        ageGroup: item.ageGroup,
      }));

      const orderResponse = await apiClient.post("/orders", {
        orderItems,
        shippingDetails: shippingAddress,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
      });

      const orderId = orderResponse.data._id;

      // If BOG payment, initiate payment flow
      if (paymentMethod === "BOG") {
        await handleBOGPayment(orderId, totalPrice);
      } else {
        // For other payment methods, redirect to order page
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
          firstName: shippingAddress?.address?.split(" ")[0] || "Customer",
          lastName: shippingAddress?.address?.split(" ")[1] || "",
          personalId: "000000000",
          address: shippingAddress?.address || "",
          phoneNumber: shippingAddress?.phoneNumber || "",
          email: user?.email || "",
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

      const response = await apiClient.post("/payments/bog/create", paymentData);
      const result = response.data;

      if (result?.redirect_url) {
        setPaymentUrl(result.redirect_url);
        setShowPaymentModal(true);
        setPaymentWindowClosed(false);
        
        // Open payment in new window
        const paymentWindow = window.open(
          result.redirect_url,
          "BOGPayment",
          "width=600,height=700,scrollbars=yes"
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
            const orderStatus = await apiClient.get(`/orders/${orderId}`);
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

  // Reopen payment window
  const reopenPaymentWindow = () => {
    if (paymentUrl) {
      const paymentWindow = window.open(
        paymentUrl,
        "BOGPayment",
        "width=600,height=700,scrollbars=yes"
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
          reason: "User closed payment modal without completing payment"
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

  if (items.length === 0) {
    return (
      <div className="empty-cart">
        <h2>{t("checkout.emptyCart")}</h2>
        <Link href="/products">{t("checkout.continueShopping")}</Link>
      </div>
    );
  }

  return (
    <div className="streamlined-checkout">
      {/* Back to Cart Button */}
      <div className="back-button-wrapper">
        <Link href="/cart" className="back-button">
          ← {t("checkout.backToCart")}
        </Link>
      </div>

      <div className="checkout-container">
        {/* Left Content - Steps */}
        <div className="checkout-content">
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className={cn("step", currentStep === "auth" && "active", user && "completed")}>
              <div className="step-circle">
                {user ? <Check className="w-4 h-4" /> : "1"}
              </div>
              <span className="step-label">{t("checkout.steps.authorization")}</span>
            </div>
            <div className={cn("step", currentStep === "shipping" && "active", shippingAddress && "completed")}>
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
                <button onClick={() => router.push("/cart")} className="btn-secondary">
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
                <LoginForm />
              </div>
            )}

            {/* Step 2: Shipping */}
            {currentStep === "shipping" && user && (
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
            {currentStep === "review" && user && shippingAddress && (
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
                    <strong>{t("auth.phoneNumber")}:</strong> {shippingAddress.phoneNumber}
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
                  <h3>შეკვეთის პროდუქტები</h3>
                  <div className="order-items-review">
                    {items.map((item) => {
                      const displayName =
                        language === "en" && item.nameEn ? item.nameEn : item.name;
                      return (
                        <div
                          key={`${item.productId}-${item.color ?? "c"}-${item.size ?? "s"}-${item.ageGroup ?? "a"}`}
                          className="order-item-row"
                        >
                          <div className="item-image">
                            <Image src={item.image} alt={displayName} fill className="object-cover" />
                          </div>
                          <div className="item-details">
                            <Link href={`/products/${item.productId}`} className="item-name">
                              {displayName}
                            </Link>
                            <p className="item-price">
                              {item.qty} x {item.price} ₾ = {item.qty * item.price} ₾
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
            <h3 className="summary-title">შეკვეთის მონაცემები</h3>
            
            <div className="summary-items">
              {items.slice(0, 3).map((item) => {
                const displayName =
                  language === "en" && item.nameEn ? item.nameEn : item.name;
                return (
                  <div
                    key={`${item.productId}-${item.color ?? "c"}-${item.size ?? "s"}-${item.ageGroup ?? "a"}`}
                    className="summary-item"
                  >
                    <div className="summary-item-image">
                      <Image src={item.image} alt={displayName} fill className="object-cover" />
                    </div>
                    <div className="summary-item-details">
                      <p className="summary-item-name">{displayName}</p>
                      <p className="summary-item-qty">
                        {item.qty} x {item.price} ₾
                      </p>
                    </div>
                    <p className="summary-item-total">{(item.qty * item.price).toFixed(2)} ₾</p>
                  </div>
                );
              })}
              {items.length > 3 && (
                <p className="summary-more">+ {items.length - 3} სხვა პროდუქტი</p>
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
                <span>{shippingPrice === 0 ? t("cart.free") : `${Number(shippingPrice).toFixed(2)} ₾`}</span>
              </div>
              <div className="summary-row">
                <span>{t("cart.commission")}</span>
                <span>{taxPrice.toFixed(2)} ₾</span>
              </div>
              
              <div className="summary-divider" />
              
              <div className="summary-row summary-total">
                <span>{t("cart.totalCost")}</span>
                <span className="total-amount">{totalPrice.toFixed(2)} ₾</span>
              </div>
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
              <button
                onClick={handlePlaceOrder}
                disabled={isValidating || unavailableItems.length > 0 || isProcessingPayment}
                className="btn-bog-payment sidebar-action-btn mobile-place-order"
              >
                <div className="bog-payment-content">
                  <div className="card-icon">
                    <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
                      <rect x="1" y="1" width="30" height="22" rx="3" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.2)"/>
                      <line x1="1" y1="7" x2="31" y2="7" stroke="white" strokeWidth="2"/>
                      <rect x="4" y="14" width="10" height="4" rx="1" fill="white"/>
                    </svg>
                  </div>
                  <div className="bog-payment-text">
                    <span className="bog-payment-title">ბარათით გადახდა</span>
                    <span className="bog-payment-subtitle">ყველა ბარათი მიიღება</span>
                  </div>
                  {(isValidating || isProcessingPayment) && <div className="spinner" />}
                </div>
                {!isValidating && !isProcessingPayment && (
                  <span className="bog-payment-amount">{totalPrice.toFixed(2)} ₾</span>
                )}
              </button>
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
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>

            <h2 className="payment-modal-title">გადახდის დასრულება</h2>
            
            <p className="payment-modal-description">
              გადახდის გვერდზე შეიყვანეთ ბარათის მონაცემები და დაასრულეთ გადახდა.
            </p>

            {paymentWindowClosed && (
              <div className="payment-modal-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>გადახდის ფანჯარა დაიხურა. დააჭირეთ ქვემოთ მის ხელახლა გასახსნელად.</span>
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
                💡 გადახდის დასრულების შემდეგ ავტომატურად გადამოგიყვანთ დადასტურების გვერდზე
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
