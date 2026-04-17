"use client";

import { CheckCircle2, XCircle, Store, ArrowLeft, Clock, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { apiClient } from "@/lib/axios";
import { Color, AgeGroupItem } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order, OrderItem } from "@/types/order";
import { PayPalButton } from "./paypal-button";
import { StripeButton } from "./stripe-button";
import { BOGButton } from "./bog-button";
import { CredoInstallmentButton } from "./credo-installment-button";
import { useUsdRate } from "@/hooks/useUsdRate";
import "./order-details.css";

interface OrderDetailsProps {
  order: Order;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { usdRate } = useUsdRate();

  // Determine which currency and amounts to show
  // Buyers see what they paid (paidCurrency/paidAmount)
  // If no paidCurrency, fall back to GEL with dual display for non-Georgia
  const displayCurrency = order.paidCurrency || "GEL";
  const displayAmount = order.paidAmount || order.totalPrice;
  
  // Currency symbol
  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case "USD":
        return "$";
      case "EUR":
        return "€";
      default:
        return "₾";
    }
  };

  const currencySymbol = getCurrencySymbol(displayCurrency);

  // Format price in the display currency
  const formatPrice = (gelPrice: number, quantity = 1): string => {
    // If order has paidCurrency, calculate proportional amount in that currency
    if (order.paidCurrency && order.paidAmount && order.totalPrice > 0) {
      // Calculate the proportion of this item to total
      const proportion = (gelPrice * quantity) / order.totalPrice;
      const amountInPaidCurrency = proportion * order.paidAmount;
      const formatted = amountInPaidCurrency.toFixed(2);
      
      return displayCurrency === "USD"
        ? `${currencySymbol}${formatted}`
        : `${formatted} ${currencySymbol}`;
    }
    
    // Fallback to GEL display
    return `${gelPrice.toFixed(2)} ₾`;
  };

  // Check if stock reservation has expired
  const isStockExpired = order.stockReservationExpires
    ? new Date() > new Date(order.stockReservationExpires)
    : false;

  // Get order status display
  const getOrderStatusDisplay = () => {
    if (order.status === "cancelled") {
      return { text: t("order.cancelled"), className: "cancelled" };
    }
    if (order.isPaid) {
      return { text: t("order.paid"), className: "paid" };
    }
    return { text: t("order.pendingPayment"), className: "pending" };
  };

  const orderStatus = getOrderStatusDisplay();

  // Fetch all colors for proper nameEn support
  const { data: availableColors = [] } = useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/categories/attributes/colors");
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Fetch all age groups for proper nameEn support
  const { data: availableAgeGroups = [] } = useQuery<AgeGroupItem[]>({
    queryKey: ["ageGroups"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/categories/attributes/age-groups"
        );
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Credo installment status polling (only for CredoInstallment orders that aren't paid yet)
  const credoOrderCode = order.paymentMethod === "CredoInstallment" && order.paymentResult?.id
    ? order.paymentResult.id
    : null;

  const { data: credoStatus, refetch: refetchCredoStatus } = useQuery({
    queryKey: ["credoStatus", credoOrderCode],
    queryFn: async () => {
      if (!credoOrderCode) return null;
      try {
        const response = await apiClient.get(
          `/payments/credo/installment/status/${credoOrderCode}`
        );
        return response.data;
      } catch {
        return null;
      }
    },
    enabled: !!credoOrderCode && !order.isPaid,
    refetchInterval: 60000, // Poll every 60 seconds
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Get localized color name based on current language
  const getLocalizedColorName = (colorName: string): string => {
    if (language === "en") {
      // Find the color in availableColors to get its English name
      const colorObj = availableColors.find(
        (color) => color.name === colorName
      );
      return colorObj?.nameEn || colorName;
    }
    return colorName;
  };

  // Get localized age group name based on current language
  const getLocalizedAgeGroupName = (ageGroupName: string): string => {
    if (language === "en") {
      // Find the age group in availableAgeGroups to get its English name
      const ageGroupObj = availableAgeGroups.find(
        (ageGroup) => ageGroup.name === ageGroupName
      );
      return ageGroupObj?.nameEn || ageGroupName;
    }
    return ageGroupName;
  };

  // Group order items by delivery type - fixed to check string equality
  const sellerDeliveryItems = order.orderItems.filter(
    (item) => item.product && String(item.product.deliveryType) === "SELLER"
  );

  const soulArtDeliveryItems = order.orderItems.filter(
    (item) => !item.product || String(item.product.deliveryType) !== "SELLER"
  );

  const paymentAmountUSD =
    order.paidCurrency === "USD"
      ? order.paidAmount || +(order.totalPrice / usdRate).toFixed(2)
      : +(order.totalPrice / usdRate).toFixed(2);

  const paymentAmountGEL = order.totalPrice;

  // Helper function to get display name based on language
  const getDisplayName = (item: OrderItem) => {
    return language === "en" && item.nameEn ? item.nameEn : item.name;
  };

  const shippingSummary = [
    order.shippingDetails.address,
    order.shippingDetails.city,
    order.shippingDetails.postalCode,
    order.shippingDetails.country,
  ]
    .filter((value): value is string => Boolean(value))
    .join(", ");

  return (
    <div className="order-container">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="back-button"
        aria-label="Go back"
      >
        <ArrowLeft className="back-icon" />
        {t("back")}
      </button>

      <div className="order-header">
        <h1 className="order-title">
          {t("order.order")} #{order._id}
        </h1>
        <span className={`order-badge ${orderStatus.className}`}>
          {orderStatus.text}
        </span>
      </div>

      <div className="order-grid">
        <div className="order-left">
          {/* Shipping Info */}
          <div className="order-card">
            <h2 className="order-subtitle">{t("order.shipping")}</h2>
            <p>
              <span className="font-medium">{t("order.address")}: </span>
              {shippingSummary}
            </p>
            <div className={`alert ${order.isDelivered ? "success" : "error"}`}>
              {order.isDelivered ? (
                <CheckCircle2 className="icon" />
              ) : (
                <XCircle className="icon" />
              )}
              <span>
                {order.isDelivered
                  ? `${t("order.deliveredOn")} ${new Date(
                      order.deliveredAt!
                    ).toLocaleDateString()}`
                  : t("order.notDelivered")}
              </span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="order-card">
            <h2 className="order-subtitle">{t("order.payment")}</h2>
            <p>
              <span className="font-medium">{t("order.method")}: </span>
              {order.paymentMethod === "CredoInstallment"
                ? (language === "ge" ? "კრედო განვადება (0%)" : "Credo Installment (0%)")
                : order.paymentMethod}
            </p>
            <div className={`alert ${order.isPaid ? "success" : "error"}`}>
              {order.isPaid ? (
                <CheckCircle2 className="icon" />
              ) : (
                <XCircle className="icon" />
              )}
              <span>
                {order.isPaid
                  ? `${t("order.paidOn")} ${new Date(
                      order.paidAt!
                    ).toLocaleDateString()}`
                  : t("order.notPaid")}
              </span>
            </div>
          </div>

          {/* Credo Installment Status */}
          {order.paymentMethod === "CredoInstallment" && !order.isPaid && (
            <div className="order-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <h2 className="order-subtitle" style={{ margin: 0 }}>
                  {language === "ge" ? "განვადების სტატუსი" : "Installment Status"}
                </h2>
                <button
                  onClick={() => refetchCredoStatus()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#6b7280",
                  }}
                  title={language === "ge" ? "სტატუსის განახლება" : "Refresh status"}
                >
                  <RefreshCw style={{ width: "14px", height: "14px" }} />
                  {language === "ge" ? "განახლება" : "Refresh"}
                </button>
              </div>

              {credoStatus?.success ? (
                <div>
                  {/* Status badge */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    backgroundColor: credoStatus.isSuccessful || credoStatus.isReadyForShipment
                      ? "#ecfdf5"
                      : credoStatus.isFailed
                        ? "#fef2f2"
                        : "#fffbeb",
                    border: `1px solid ${
                      credoStatus.isSuccessful || credoStatus.isReadyForShipment
                        ? "#a7f3d0"
                        : credoStatus.isFailed
                          ? "#fecaca"
                          : "#fde68a"
                    }`,
                    marginBottom: "12px",
                  }}>
                    {credoStatus.isSuccessful || credoStatus.isReadyForShipment ? (
                      <CheckCircle2 style={{ width: "20px", height: "20px", color: "#059669" }} />
                    ) : credoStatus.isFailed ? (
                      <XCircle style={{ width: "20px", height: "20px", color: "#dc2626" }} />
                    ) : (
                      <Clock style={{ width: "20px", height: "20px", color: "#d97706" }} />
                    )}
                    <div>
                      <div style={{
                        fontWeight: 600,
                        color: credoStatus.isSuccessful || credoStatus.isReadyForShipment
                          ? "#059669"
                          : credoStatus.isFailed
                            ? "#dc2626"
                            : "#d97706",
                      }}>
                        {credoStatus.statusName}
                      </div>
                      <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
                        {credoStatus.isSuccessful || credoStatus.isReadyForShipment
                          ? (language === "ge" ? "განვადება დამტკიცებულია" : "Installment approved")
                          : credoStatus.isFailed
                            ? (language === "ge" ? "სამწუხაროდ, განვადება არ დამტკიცდა" : "Installment was not approved")
                            : (language === "ge" ? "განვადების განაცხადი მუშავდება" : "Installment application is being processed")}
                      </div>
                    </div>
                  </div>

                  {/* Additional info */}
                  {credoStatus.isPending && (
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      fontSize: "13px",
                      color: "#0369a1",
                    }}>
                      {language === "ge"
                        ? "მარაგი დარეზერვებულია თქვენთვის. განვადების დამტკიცების შემდეგ შეკვეთა ავტომატურად დადასტურდება."
                        : "Stock is reserved for you. After installment approval, the order will be automatically confirmed."}
                    </div>
                  )}

                  {credoStatus.isReadyForShipment && (
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      fontSize: "13px",
                      color: "#065f46",
                    }}>
                      {language === "ge"
                        ? "ხელშეკრულება ხელმოწერილია. პროდუქტი მალე გამოგეგზავნებათ."
                        : "Contract signed. Your product will be shipped soon."}
                    </div>
                  )}

                  {credoStatus.isFailed && (
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      fontSize: "13px",
                      color: "#991b1b",
                    }}>
                      <p style={{ marginBottom: "8px" }}>
                        {language === "ge"
                          ? "განვადება არ დამტკიცდა. შეკვეთა გაუქმდა და სტოკი გათავისუფლდა. შეგიძლიათ ხელახლა შეუკვეთოთ სხვა გადახდის მეთოდით."
                          : "Installment was not approved. The order has been cancelled and stock released. You can re-order with a different payment method."}
                      </p>
                      <Link
                        href="/shop"
                        style={{
                          display: "inline-block",
                          padding: "8px 16px",
                          borderRadius: "8px",
                          backgroundColor: "#1e293b",
                          color: "white",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        {language === "ge" ? "მაღაზიაში დაბრუნება" : "Back to Shop"}
                      </Link>
                    </div>
                  )}
                </div>
              ) : credoOrderCode ? (
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <Clock style={{ width: "20px", height: "20px", color: "#d97706" }} />
                  <div>
                    <div style={{ fontWeight: 600, color: "#d97706" }}>
                      {language === "ge" ? "განაცხადი გაგზავნილია" : "Application submitted"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
                      {language === "ge"
                        ? "კრედო ბანკი განიხილავს თქვენს განაცხადს. სტატუსი განახლდება ავტომატურად."
                        : "Credo Bank is reviewing your application. Status will update automatically."}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  fontSize: "13px",
                  color: "#6b7280",
                }}>
                  {language === "ge"
                    ? "განვადების მოთხოვნის გასაგზავნად დააჭირეთ ქვემოთ მოცემულ ღილაკს."
                    : "Click the button below to submit your installment request."}
                </div>
              )}
            </div>
          )}

          {/* Order Items - Grouped by delivery type with fixed string comparison */}
          <div className="order-card">
            <h2 className="order-subtitle">{t("order.orderItems")}</h2>

            {sellerDeliveryItems.length > 0 && (
              <div className="delivery-group">
                <div className="delivery-group-header">
                  <Store className="icon" />
                  <h3>{t("order.sellerDelivery")}</h3>
                </div>
                {sellerDeliveryItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.color ?? "c"}-${
                      item.size ?? "s"
                    }-${item.ageGroup ?? "a"}`}
                    className="order-item"
                  >
                    <div className="order-item-image">
                      <Image
                        src={item.image}
                        alt={getDisplayName(item)}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>{" "}
                    <div className="order-item-details">
                      <Link
                        href={`/products/${item.productId}`}
                        className="order-item-link"
                      >
                        {getDisplayName(item)}
                      </Link>{" "}
                      {/* Display variant information if available */}
                      {(item.size || item.color || item.ageGroup) && (
                        <div className="variant-info">
                          {item.size && (
                            <span className="variant-tag">
                              {t("cart.size")}: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="variant-tag">
                              {t("cart.color")}:{" "}
                              {getLocalizedColorName(item.color)}
                            </span>
                          )}
                          {item.ageGroup && (
                            <span className="variant-tag">
                              {t("cart.age")}:{" "}
                              {getLocalizedAgeGroupName(item.ageGroup)}
                            </span>
                          )}
                        </div>
                      )}
                      <p>
                        {item.qty} x{" "}
                        {formatPrice(item.price, 1)}{" "}
                        ={" "}
                        {formatPrice(item.price, item.qty)}
                      </p>
                      {item.product?.minDeliveryDays &&
                        item.product?.maxDeliveryDays && (
                          <p className="delivery-time">
                            {t("order.deliveryTime")}:{" "}
                            {item.product.minDeliveryDays}-
                            {item.product.maxDeliveryDays} {t("order.days")}
                          </p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {soulArtDeliveryItems.length > 0 && (
              <div className="delivery-group">
                {/* <div className="delivery-group-header">
                  <Truck className="icon" />
                  <h3>{t("soulArt Courier")}</h3>
                </div> */}
                {soulArtDeliveryItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.color ?? "c"}-${
                      item.size ?? "s"
                    }-${item.ageGroup ?? "a"}`}
                    className="order-item"
                  >
                    <div className="order-item-image">
                      <Image
                        src={item.image}
                        alt={getDisplayName(item)}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>{" "}
                    <div className="order-item-details">
                      <Link
                        href={`/products/${item.productId}`}
                        className="order-item-link"
                      >
                        {getDisplayName(item)}
                      </Link>{" "}
                      {/* Display variant information if available */}
                      {(item.size || item.color || item.ageGroup) && (
                        <div className="variant-info">
                          {item.size && (
                            <span className="variant-tag">
                              {t("cart.size")}: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="variant-tag">
                              {t("cart.color")}:{" "}
                              {getLocalizedColorName(item.color)}
                            </span>
                          )}
                          {item.ageGroup && (
                            <span className="variant-tag">
                              {t("cart.age")}:{" "}
                              {getLocalizedAgeGroupName(item.ageGroup)}
                            </span>
                          )}
                        </div>
                      )}
                      <p>
                        {item.qty} x{" "}
                        {formatPrice(item.price, 1)}
                        ={" "}
                        {formatPrice(item.price, item.qty)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="order-right">
          <div className="order-card">
            <h2 className="order-subtitle">{t("order.orderSummary")}</h2>
            <div className="order-summary">
              <div className="summary-item">
                <span>{t("order.items")}</span>
                <span>
                  {formatPrice(order.itemsPrice, 1)}
                </span>
              </div>
              <div className="summary-item">
                <span>{t("order.shipping")}</span>
                <span>
                  {order.shippingPrice === 0
                    ? t("order.free")
                    : formatPrice(order.shippingPrice, 1)}
                </span>
              </div>
              <div className="summary-item">
                <span>{t("order.tax")}</span>
                <span>
                  {formatPrice(order.taxPrice, 1)}
                </span>
              </div>
              <hr />
              <div className="summary-total">
                <span>{t("order.total")}</span>
                <span>
                  {formatPrice(displayAmount, 1)}
                </span>
              </div>
              {/* Stock expiration warning */}
              {!order.isPaid && isStockExpired && (
                <div className="alert error" style={{ marginBottom: "1rem" }}>
                  <XCircle className="icon" />
                  <span>{t("order.stockExpired")}</span>
                </div>
              )}

              {/* Order cancelled message */}
              {order.status === "cancelled" && (
                <div className="alert error" style={{ marginBottom: "1rem" }}>
                  <XCircle className="icon" />
                  <span>
                    {t("order.orderCancelled")}
                    {order.statusReason && ` - ${order.statusReason}`}
                  </span>
                </div>
              )}

              {/* Stock expiration countdown */}
              {!order.isPaid &&
                !isStockExpired &&
                order.status !== "cancelled" &&
                order.stockReservationExpires && (
                  <div
                    className="alert warning"
                    style={{ marginBottom: "1rem" }}
                  >
                    <span>
                      {t("order.stockReserved")}:{" "}
                      {new Date(order.stockReservationExpires).toLocaleString()}
                    </span>
                  </div>
                )}

              {!order.isPaid &&
                !isStockExpired &&
                order.status !== "cancelled" &&
                (order.paymentMethod === "PayPal" ? (
                  <PayPalButton
                    orderId={order._id}
                    amount={paymentAmountUSD}
                    currency={(order.paidCurrency as "USD" | "EUR") || "USD"}
                  />
                ) : order.paymentMethod === "BOG" ? (
                  <BOGButton orderId={order._id} amount={paymentAmountGEL} />
                ) : order.paymentMethod === "CredoInstallment" ? (
                  <CredoInstallmentButton
                    orderId={order._id}
                    items={order.orderItems.map((item: OrderItem) => ({
                      productId: typeof item.productId === 'string' ? item.productId : (item.productId as { _id?: { toString(): string } })?._id?.toString() || '',
                      name: item.name,
                      qty: item.qty,
                      price: item.price,
                    }))}
                  />
                ) : (
                  <StripeButton orderId={order._id} amount={paymentAmountUSD} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
