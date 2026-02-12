"use client";

import { CheckCircle2, XCircle, Store, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Color, AgeGroupItem } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order, OrderItem } from "@/types/order";
import { PayPalButton } from "./paypal-button";
import { StripeButton } from "./stripe-button";
import { BOGButton } from "./bog-button";
import { useUsdRate } from "@/hooks/useUsdRate";
import "./order-details.css";

interface OrderDetailsProps {
  order: Order;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { usdRate } = useUsdRate();

  // Format price based on shipping country (show dual currency for non-Georgia countries)
  const formatPrice = (priceInGel: number, shippingCountry?: string): string => {
    const isGeorgia =
      shippingCountry === "Georgia" || shippingCountry === "საქართველო";

    if (isGeorgia) {
      return `${priceInGel.toFixed(2)} ₾`;
    } else {
      const priceInUsd = (priceInGel / usdRate).toFixed(2);
      return `${priceInGel.toFixed(2)} ₾ ($${priceInUsd})`;
    }
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

  // Convert GEL to USD for payment
  const totalPriceInUSD = +(order.totalPrice / usdRate).toFixed(2);

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
                  ? `${t("order.paidOn")} ${new Date(
                      order.paidAt!
                    ).toLocaleDateString()}`
                  : t("order.notPaid")}
              </span>
            </div>
          </div>

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
                        {formatPrice(item.price, order.shippingDetails.country)}{" "}
                        ={" "}
                        {formatPrice(
                          item.qty * item.price,
                          order.shippingDetails.country
                        )}
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
                        {formatPrice(item.price, order.shippingDetails.country)}
                        ={" "}
                        {formatPrice(
                          item.qty * item.price,
                          order.shippingDetails.country
                        )}
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
                  {formatPrice(order.itemsPrice, order.shippingDetails.country)}
                </span>
              </div>
              <div className="summary-item">
                <span>{t("order.shipping")}</span>
                <span>
                  {order.shippingPrice === 0
                    ? t("order.free")
                    : formatPrice(
                        order.shippingPrice,
                        order.shippingDetails.country
                      )}
                </span>
              </div>
              <div className="summary-item">
                <span>{t("order.tax")}</span>
                <span>
                  {formatPrice(order.taxPrice, order.shippingDetails.country)}
                </span>
              </div>
              <hr />
              <div className="summary-total">
                <span>{t("order.total")}</span>
                <span>
                  {formatPrice(order.totalPrice, order.shippingDetails.country)}
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
