"use client";

import { useCheckout } from "../context/checkout-context";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { TAX_RATE } from "@/config/constants";
import { useLanguage } from "@/hooks/LanguageContext";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import "./order-review.css";
import { useCart } from "@/modules/cart/context/cart-context";

export function OrderReview() {
  const { shippingAddress: shippingDetails, paymentMethod } = useCheckout();
  const { items, clearCart } = useCart();
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isValidating, setIsValidating] = useState(false);
  const [unavailableItems, setUnavailableItems] = useState<
    Array<{
      productId: string;
      name: string;
      reason: string;
    }>
  >([]);

  const itemsPrice = items.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const shippingPrice: number = itemsPrice > 100 ? 0 : 0;
  const taxPrice = Number((itemsPrice * TAX_RATE).toFixed(2));
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

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
          })
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

      const response = await apiClient.post("/orders", {
        orderItems,
        shippingDetails,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
      });

      await clearCart();
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
      {/* Back Button */}
      <div className="col-span-12">
        <button
          type="button"
          onClick={() => router.back()}
          className="back-button"
        >
          <ArrowLeft size={20} />
          უკან დაბრუნება
        </button>
      </div>

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
          <h2 className="section-title">Shipping</h2>
          <p className="address-details">
            <strong>Address: </strong>
            {shippingDetails?.address}, {shippingDetails?.city},{" "}
            {shippingDetails?.postalCode}, {shippingDetails?.country}
          </p>
        </div>

        {/* Payment Method */}
        <div className="card p-6">
          <h2 className="section-title">Payment</h2>
          <p className="payment-method">
            <strong>Method: </strong>
            {paymentMethod}
          </p>
        </div>

        {/* Order Items */}
        <div className="card p-6">
          <h2 className="section-title">Order Items</h2>
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
                      {item.qty} x {item.price} ₾ = {item.qty * item.price} ₾
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
          <h2 className="section-title">Order Summary</h2>
          <div className="summary-details space-y-4">
            <div className="summary-row flex justify-between">
              <span className="summary-label text-muted-foreground">Items</span>
              <span>{itemsPrice.toFixed(2)} ₾</span>
            </div>
            <div className="summary-row flex justify-between">
              <span className="summary-label text-muted-foreground">
                Shipping
              </span>
              <span>
                {shippingPrice === 0 ? "Free" : `${shippingPrice.toFixed(2)}₾`}
              </span>
            </div>
            <div className="summary-row flex justify-between">
              <span className="summary-label text-muted-foreground">Tax</span>
              <span>{taxPrice.toFixed(2)} ₾</span>
            </div>
            <div className="separator" />
            <div className="summary-row flex justify-between font-medium">
              <span>Total</span>
              <span>{totalPrice.toFixed(2)} ₾</span>
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
