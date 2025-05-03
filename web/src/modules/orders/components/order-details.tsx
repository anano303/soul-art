"use client";

import { CheckCircle2, XCircle, Truck, Store } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import Image from "next/image";
import Link from "next/link";
import { Order } from "@/types/order";
import { PayPalButton } from "./paypal-button";
import { StripeButton } from "./stripe-button";
import "./order-details.css";

// ლარი დოლარში გადამყვანი კურსი (1 ლარი = ~0.37 დოლარი)
const GEL_TO_USD_RATE = 2.8;

interface OrderDetailsProps {
  order: Order;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const { t } = useLanguage();

  // Group order items by delivery type - fixed to check string equality
  const sellerDeliveryItems = order.orderItems.filter(
    (item) => item.product && String(item.product.deliveryType) === "SELLER"
  );

  const soulartDeliveryItems = order.orderItems.filter(
    (item) => !item.product || String(item.product.deliveryType) !== "SELLER"
  );

  console.log("Seller items:", sellerDeliveryItems);
  console.log("SoulArt items:", soulartDeliveryItems);

  // ლარის დოლარში გადაყვანა გადახდისთვის
  const totalPriceInUSD = +(order.totalPrice / GEL_TO_USD_RATE).toFixed(2);

  return (
    <div className="order-container">
      <div className="order-header">
        <h1 className="order-title">
          {t("Order")} #{order._id}
        </h1>
        <span className={`order-badge ${order.isPaid ? "paid" : "pending"}`}>
          {order.isPaid ? t("Paid") : t("Pending Payment")}
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
                  <div key={item.productId} className="order-item">
                    <div className="order-item-image">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="order-item-details">
                      <Link
                        href={`/products/${item.productId}`}
                        className="order-item-link"
                      >
                        {item.name}
                      </Link>
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

            {soulartDeliveryItems.length > 0 && (
              <div className="delivery-group">
                <div className="delivery-group-header">
                  <Truck className="icon" />
                  <h3>{t("SoulArt Courier")}</h3>
                </div>
                {soulartDeliveryItems.map((item) => (
                  <div key={item.productId} className="order-item">
                    <div className="order-item-image">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="order-item-details">
                      <Link
                        href={`/products/${item.productId}`}
                        className="order-item-link"
                      >
                        {item.name}
                      </Link>
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

              {!order.isPaid &&
                (order.paymentMethod === "PayPal" ? (
                  <PayPalButton orderId={order._id} amount={totalPriceInUSD} />
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
