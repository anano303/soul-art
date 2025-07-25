"use client";

import { CheckCircle2, XCircle, Store } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Color, AgeGroupItem } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { Order, OrderItem } from "@/types/order";
import { PayPalButton } from "./paypal-button";
import { StripeButton } from "./stripe-button";
import { BOGButton } from "./bog-button";
import "./order-details.css";

// ლარი დოლარში გადამყვანი კურსი (1 ლარი = ~0.37 დოლარი)
const GEL_TO_USD_RATE = 2.8;

interface OrderDetailsProps {
  order: Order;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const { t, language } = useLanguage();

  // Check if stock reservation has expired
  const isStockExpired = order.stockReservationExpires
    ? new Date() > new Date(order.stockReservationExpires)
    : false;

  // Get order status display
  const getOrderStatusDisplay = () => {
    if (order.status === "cancelled") {
      return { text: t("Cancelled"), className: "cancelled" };
    }
    if (order.isPaid) {
      return { text: t("Paid"), className: "paid" };
    }
    return { text: t("Pending Payment"), className: "pending" };
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

  const fishhuntDeliveryItems = order.orderItems.filter(
    (item) => !item.product || String(item.product.deliveryType) !== "SELLER"
  );

  // ლარის დოლარში გადაყვანა გადახდისთვის
  const totalPriceInUSD = +(order.totalPrice / GEL_TO_USD_RATE).toFixed(2);

  // Helper function to get display name based on language
  const getDisplayName = (item: OrderItem) => {
    return language === "en" && item.nameEn ? item.nameEn : item.name;
  };

  return (
    <div className="order-container">
      <div className="order-header">
        <h1 className="order-title">
          {t("Order")} #{order._id}
        </h1>
        <span className={`order-badge ${orderStatus.className}`}>
          {orderStatus.text}
        </span>
      </div>

      <div className="order-grid">
        <div className="order-left">
          {/* Shipping Info */}
          <div className="order-card">
            <h2 className="order-subtitle">{t("Shipping")}</h2>
            <p>
              <span className="font-medium">{t("Address")}: </span>
              {order.shippingDetails.address}, {order.shippingDetails.city},{" "}
              {order.shippingDetails.postalCode},{" "}
              {order.shippingDetails.country}
            </p>
            <div className={`alert ${order.isDelivered ? "success" : "error"}`}>
              {order.isDelivered ? (
                <CheckCircle2 className="icon" />
              ) : (
                <XCircle className="icon" />
              )}
              <span>
                {order.isDelivered
                  ? `${t("Delivered on")} ${new Date(
                      order.deliveredAt!
                    ).toLocaleDateString()}`
                  : t("Not Delivered")}
              </span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="order-card">
            <h2 className="order-subtitle">{t("Payment")}</h2>
            <p>
              <span className="font-medium">{t("Method")}: </span>
              {order.paymentMethod}
            </p>
            <div className={`alert ${order.isPaid ? "success" : "error"}`}>
              {order.isPaid ? (
                <CheckCircle2 className="icon" />
              ) : (
                <XCircle className="icon" />
              )}
              <span>
                {order.isPaid
                  ? `${t("Paid on")} ${new Date(
                      order.paidAt!
                    ).toLocaleDateString()}`
                  : t("Not Paid")}
              </span>
            </div>
          </div>

          {/* Order Items - Grouped by delivery type with fixed string comparison */}
          <div className="order-card">
            <h2 className="order-subtitle">{t("Order Items")}</h2>

            {sellerDeliveryItems.length > 0 && (
              <div className="delivery-group">
                <div className="delivery-group-header">
                  <Store className="icon" />
                  <h3>{t("Seller Delivery")}</h3>
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
                        {item.qty} x {item.price.toFixed(2)} ₾ ={" "}
                        {(item.qty * item.price).toFixed(2)} ₾
                      </p>
                      {item.product?.minDeliveryDays &&
                        item.product?.maxDeliveryDays && (
                          <p className="delivery-time">
                            {t("Delivery Time")}: {item.product.minDeliveryDays}
                            -{item.product.maxDeliveryDays} {t("days")}
                          </p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fishhuntDeliveryItems.length > 0 && (
              <div className="delivery-group">
                {/* <div className="delivery-group-header">
                  <Truck className="icon" />
                  <h3>{t("fishhunt Courier")}</h3>
                </div> */}
                {fishhuntDeliveryItems.map((item) => (
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
                        {item.qty} x {item.price.toFixed(2)} ₾={" "}
                        {(item.qty * item.price).toFixed(2)} ₾
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
            <h2 className="order-subtitle">{t("Order Summary")}</h2>
            <div className="order-summary">
              <div className="summary-item">
                <span>{t("Items")}</span>
                <span>{order.itemsPrice.toFixed(2)} ₾</span>
              </div>
              <div className="summary-item">
                <span>{t("Shipping")}</span>
                <span>
                  {order.shippingPrice === 0
                    ? t("Free")
                    : `${order.shippingPrice.toFixed(2)} ₾`}
                </span>
              </div>
              <div className="summary-item">
                <span>{t("Tax")}</span>
                <span>{order.taxPrice.toFixed(2)} ₾</span>
              </div>
              <hr />
              <div className="summary-total">
                <span>{t("Total")}</span>
                <span>{order.totalPrice.toFixed(2)} ₾</span>
              </div>

              {/* დავამატოთ დოლარის ეკვივალენტი */}
              <div className="summary-total-usd">
                <span>{t("Total (USD)")}</span>
                <span>${totalPriceInUSD}</span>
              </div>

              {/* Stock expiration warning */}
              {!order.isPaid && isStockExpired && (
                <div className="alert error" style={{ marginBottom: "1rem" }}>
                  <XCircle className="icon" />
                  <span>
                    {t(
                      "Stock reservation has expired. Please create a new order."
                    )}
                  </span>
                </div>
              )}

              {/* Order cancelled message */}
              {order.status === "cancelled" && (
                <div className="alert error" style={{ marginBottom: "1rem" }}>
                  <XCircle className="icon" />
                  <span>
                    {t("Order has been cancelled")}
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
                      {t("Stock reserved until")}:{" "}
                      {new Date(order.stockReservationExpires).toLocaleString()}
                    </span>
                  </div>
                )}

              {!order.isPaid &&
                !isStockExpired &&
                order.status !== "cancelled" &&
                (order.paymentMethod === "PayPal" ? (
                  <PayPalButton orderId={order._id} amount={totalPriceInUSD} />
                ) : order.paymentMethod === "BOG" ? (
                  <BOGButton orderId={order._id} amount={order.totalPrice} />
                ) : (
                  <StripeButton orderId={order._id} amount={totalPriceInUSD} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
