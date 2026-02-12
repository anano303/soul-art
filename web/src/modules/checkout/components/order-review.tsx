"use client";

import { useCheckout } from "../context/checkout-context";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { calculateShipping, getShippingRate } from "@/lib/shipping";
import { useUsdRate } from "@/hooks/useUsdRate";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import "./order-review.css";
import { useCart } from "@/modules/cart/context/cart-context";
import Cookies from "js-cookie";

export function OrderReview() {
  const {
    shippingAddress: shippingDetails,
    paymentMethod,
    clearCheckout,
  } = useCheckout();
  const { items, clearCart } = useCart();
  const router = useRouter();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const [isValidating, setIsValidating] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [unavailableItems, setUnavailableItems] = useState<
    Array<{
      productId: string;
      name: string;
      reason: string;
    }>
  >([]);

  // Force re-render when shipping address changes
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localStorage.getItem("checkout_shipping_address");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.country !== shippingDetails?.country) {
            setForceUpdate((prev: number) => prev + 1);
          }
        } catch (e) {
          // ignore
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [shippingDetails?.country]);

  const itemsPrice = items.reduce(
    (acc, item) => acc + item.price * item.qty,
    0,
  );

  // Calculate shipping based on selected country
  // Get the latest shipping address from localStorage if context is stale
  let currentShippingDetails = shippingDetails;
  try {
    const stored = localStorage.getItem("checkout_shipping_address");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.country) {
        currentShippingDetails = parsed;
      }
    }
  } catch (e) {
    // Use context fallback
  }

  const shippingCountry = currentShippingDetails?.country || "GE";
  const shippingCity = currentShippingDetails?.city || "";
  const shippingPrice = calculateShipping(shippingCountry, shippingCity);
  const isShippingFree = shippingPrice === 0;
  const isGeorgia = shippingCountry === "GE" || shippingCountry === "საქართველო" || shippingCountry === "Georgia";
  const showBothCurrencies = !isGeorgia;

  // საკომისიო მოხსნილია - რეალური ფასი ყველგან
  const totalPrice = itemsPrice + shippingPrice;

  // USD conversion rate from API
  const { usdRate } = useUsdRate();
  const GEL_TO_USD = 1 / usdRate;

  // Function to format price based on country selection
  const formatPrice = (amount: number) => {
    if (showBothCurrencies) {
      return `${amount.toFixed(2)} ₾ ($${(amount * GEL_TO_USD).toFixed(2)})`;
    }
    return `${amount.toFixed(2)} ₾`;
  };

  // ფუნქცია პროდუქტების მარაგის შესამოწმებლად
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

  const handlePlaceOrder = async () => {
    setIsValidating(true);
    setUnavailableItems([]);

    try {
      // ჯერ ვალიდაცია
      const validationResult = await validateCartItems();

      if (!validationResult.isValid) {
        // თუ რამე პროდუქტი მიუწვდომელია
        const unavailable = validationResult.unavailableItems.map(
          (item: any) => ({
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
          description: `ზოგი პროდუქტი მიუწვდომელია. გთხოვთ, შეამოწმოთ ქვემოთ`,
          variant: "destructive",
        });

        return;
      }

      // თუ ყველაფერი ok-ია, შეკვეთის შექმნა
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

      // Sales Manager referral code from cookie
      const salesRefCode = Cookies.get("sales_ref") || null;

      const response = await apiClient.post("/orders", {
        orderItems,
        shippingDetails: currentShippingDetails,
        paymentMethod,
        itemsPrice,
        taxPrice: 0, // საკომისიო მოხსნილია
        shippingPrice,
        totalPrice, // რეალური ფასი საკომისიოს გარეშე
        salesRefCode,
      });

      await clearCart();
      clearCheckout();
      router.push(`/orders/${response.data._id}`);
    } catch (error: any) {
      console.error("Order error:", error);

      // თუ backend-იდან სპეციალური ერორი მოვა
      if (error?.response?.data?.message === "ITEMS_UNAVAILABLE") {
        const unavailableFromServer =
          error.response.data.unavailableItems || [];
        const unavailable = unavailableFromServer.map((item: any) => ({
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
        }));

        setUnavailableItems(unavailable);

        toast({
          title: "შეკვეთის შეცდომა",
          description: "ზოგი პროდუქტი მიუწვდომელია",
          variant: "destructive",
        });
      } else {
        toast({
          title: "შეკვეთის შეცდომა",
          description: "გთხოვთ, სცადოთ ხელახლა",
          variant: "destructive",
        });
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="order-review-grid">
      {/* Unavailable Items Error Display */}
      {unavailableItems.length > 0 && (
        <div className="col-span-12 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-2">
                მიუწვდომელი პროდუქტები
              </h3>
              <p className="text-red-700 text-sm mb-3">
                შემდეგი პროდუქტები აღარ არის ხელმისაწვდომი:
              </p>
              <ul className="space-y-2">
                {unavailableItems.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center justify-between bg-white px-3 py-2 rounded border"
                  >
                    <span className="font-medium text-gray-900">
                      {item.name}
                    </span>
                    <span className="text-sm text-red-600">{item.reason}</span>
                  </li>
                ))}
              </ul>
              <p className="text-red-700 text-sm mt-3">
                გთხოვთ, წაშალოთ ეს პროდუქტები კალათიდან ან შეცვალოთ რაოდენობა
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => router.push("/cart")}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  კალათში დაბრუნება
                </button>
                <button
                  onClick={() => {
                    setUnavailableItems([]);
                    validateCartItems();
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                  disabled={isValidating}
                >
                  {isValidating ? "შემოწმება..." : "თავიდან შემოწმება"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="order-details col-span-8 space-y-6">
        {/* Shipping Address */}
        <div className="card p-6">
          <h2 className="section-title">{t("checkout.shippingAddress")}</h2>
          <p className="address-details">
            <strong>{t("checkout.streetAddress")}: </strong>
            {currentShippingDetails?.address}, {currentShippingDetails?.city},{" "}
            {currentShippingDetails?.postalCode},{" "}
            {currentShippingDetails?.country}
          </p>
          <p className="address-details">
            <strong>{t("auth.phoneNumber")}: </strong>
            {currentShippingDetails?.phoneNumber}
          </p>
          {/* Shipping cost info */}
          <div className="shipping-info mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm">
              <strong>{t("cart.shippingCost")}: </strong>
              {isShippingFree ? (
                <span className="text-green-600">{t("cart.free")}</span>
              ) : (
                <span className="text-blue-600">
                  {formatPrice(shippingPrice)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Payment Method */}
        <div className="card p-6">
          <h2 className="section-title">{t("checkout.steps.payment")}</h2>
          <p className="payment-method">
            <strong>{t("checkout.stepIndicators.payment.title")}: </strong>
            {paymentMethod}
          </p>
        </div>

        {/* Order Items */}
        <div className="card p-6">
          <h2 className="section-title">
            {t("checkout.stepIndicators.review.title")}
          </h2>
          <div className="order-items space-y-4">
            {items.map((item) => {
              // Display name based on selected language
              const displayName =
                language === "en" && item.nameEn ? item.nameEn : item.name;

              return (
                <div
                  key={`${item.productId}-${item.color ?? "c"}-${
                    item.size ?? "s"
                  }-${item.ageGroup ?? "a"}`}
                  className="order-item flex items-center space-x-4"
                >
                  <div className="image-container relative h-20 w-20">
                    <Image
                      src={item.image}
                      alt={displayName}
                      fill
                      className="object-cover rounded-md"
                    />
                  </div>
                  <div className="order-item-details flex-1">
                    <Link
                      href={`/products/${item.productId}`}
                      className="item-name font-medium hover:underline"
                    >
                      {displayName}
                    </Link>
                    <p className="item-price text-sm text-muted-foreground">
                      {item.qty} x {formatPrice(item.price)} ={" "}
                      {formatPrice(item.qty * item.price)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="order-summary col-span-4">
        <div className="card p-6">
          <h2 className="section-title">{t("cart.total")}</h2>
          <div className="summary-details space-y-4">
            <div className="summary-row flex justify-between">
              <span className="summary-label text-muted-foreground">
                {t("cart.items")}
              </span>
              <span>{formatPrice(itemsPrice)}</span>
            </div>
            <div className="summary-row flex justify-between">
              <span className="summary-label text-muted-foreground">
                {t("cart.delivery")}
              </span>
              <span>
                {isShippingFree ? t("cart.free") : formatPrice(shippingPrice)}
              </span>
            </div>
            {/* საკომისიო დაკომენტარებულია - ბანკის გვერდზე ნახავს
            <div className="summary-row flex justify-between">
              <span className="summary-label text-muted-foreground">
                {t("cart.commission")}
              </span>
              <span>{formatPrice(taxPrice)}</span>
            </div>
            */}
            <div className="separator" />
            <div className="summary-row flex justify-between font-medium">
              <span>{t("cart.totalCost")}</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <button
              className="place-order-button w-full"
              onClick={handlePlaceOrder}
              disabled={isValidating || unavailableItems.length > 0}
            >
              {isValidating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  შემოწმება...
                </div>
              ) : unavailableItems.length > 0 ? (
                "პროდუქტები მიუწვდომელია"
              ) : (
                "შეკვეთის გაფორმება"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
