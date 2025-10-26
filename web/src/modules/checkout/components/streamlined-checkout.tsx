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
import { ShippingForm } from "./shipping-form";
import { Check, AlertTriangle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import "./streamlined-checkout.css";

type CheckoutStep = "auth" | "shipping" | "payment" | "review";

export function StreamlinedCheckout() {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { shippingAddress, setPaymentMethod, paymentMethod, clearCheckout } =
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

  // Calculate totals
  const itemsPrice = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shippingPrice = itemsPrice > 100 ? 0 : 0;
  const taxPrice = Number((itemsPrice * TAX_RATE).toFixed(2));
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  // Auto-advance steps based on state
  useEffect(() => {
    if (!user) {
      setCurrentStep("auth");
    } else if (!shippingAddress) {
      setCurrentStep("shipping");
    } else if (!paymentMethod) {
      setCurrentStep("payment");
      // Auto-set BOG as default
      setPaymentMethod("BOG");
    } else {
      setCurrentStep("review");
    }
  }, [user, shippingAddress, paymentMethod, setPaymentMethod]);

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
        // Try to open in modal first, fallback to new window
        setPaymentUrl(result.redirect_url);
        setShowPaymentModal(true);
        
        // Also open in new window as fallback (in case iframe is blocked)
        const paymentWindow = window.open(
          result.redirect_url,
          "BOGPayment",
          "width=600,height=700,scrollbars=yes"
        );
        
        // Listen for payment completion
        window.addEventListener("message", (event) => {
          if (event.data.type === "payment_success") {
            clearCart();
            clearCheckout();
            setShowPaymentModal(false);
            if (paymentWindow) paymentWindow.close();
            router.push(`/checkout/success?orderId=${orderId}`);
          } else if (event.data.type === "payment_fail") {
            setShowPaymentModal(false);
            if (paymentWindow) paymentWindow.close();
            router.push(`/checkout/fail?orderId=${orderId}`);
          }
        });
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
            <div className={cn("step", currentStep === "payment" && "active", paymentMethod && "completed")}>
              <div className="step-circle">
                {paymentMethod ? <Check className="w-4 h-4" /> : "3"}
              </div>
              <span className="step-label">{t("checkout.steps.payment")}</span>
            </div>
            <div className={cn("step", currentStep === "review" && "active")}>
              <div className="step-circle">4</div>
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
                <ShippingForm />
              </div>
            )}

            {/* Step 3: Payment Method */}
            {currentStep === "payment" && user && shippingAddress && (
              <div className="step-section">
                <h2>{t("checkout.stepIndicators.payment.title")}</h2>
                <p className="step-description">
                  {t("checkout.stepIndicators.payment.description")}
                </p>
                <div className="payment-method-card">
                  <label className="payment-option selected">
                    <input
                      type="radio"
                      name="payment"
                      value="BOG"
                      checked={paymentMethod === "BOG"}
                      onChange={() => setPaymentMethod("BOG")}
                    />
                    <div className="payment-option-content">
                      <svg className="payment-icon" viewBox="0 0 24 24" fill="green">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <span className="payment-label">ბანკის ბარათით გადახდა (BOG)</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Step 4: Review & Place Order */}
            {currentStep === "review" && user && shippingAddress && paymentMethod && (
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
                    onClick={() => setCurrentStep("shipping")}
                    className="btn-link"
                  >
                    შეცვლა
                  </button>
                </div>

                {/* Payment Method Review */}
                <div className="review-card">
                  <h3>{t("checkout.steps.payment")}</h3>
                  <p>{paymentMethod}</p>
                  <button
                    onClick={() => setCurrentStep("payment")}
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

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isValidating || unavailableItems.length > 0 || isProcessingPayment}
                  className="btn-primary btn-large"
                >
                  {isValidating || isProcessingPayment ? (
                    <>
                      <div className="spinner" />
                      {isProcessingPayment ? "გადახდის გვერდზე გადასვლა..." : "შემოწმება..."}
                    </>
                  ) : unavailableItems.length > 0 ? (
                    "პროდუქტები მიუწვდომელია"
                  ) : (
                    `შეკვეთის გაფორმება - ${totalPrice.toFixed(2)} ₾`
                  )}
                </button>
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
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentUrl && (
        <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <h3>გადახდის გვერდი</h3>
              <button onClick={() => setShowPaymentModal(false)} className="close-button">
                ✕
              </button>
            </div>
            <iframe
              src={paymentUrl}
              className="payment-iframe"
              title="BOG Payment"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
            />
            <div className="payment-modal-footer">
              <p className="text-sm text-gray-600">
                თუ გადახდის გვერდი არ გაიხსნა, <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">დააჭირეთ აქ</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
