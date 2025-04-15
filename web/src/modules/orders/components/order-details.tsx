"use client";

import { CheckCircle2, XCircle, Truck, Store } from "lucide-react";
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
        <h1 className="order-title">Order #{order._id}</h1>
        <span className={`order-badge ${order.isPaid ? "paid" : "pending"}`}>
          {order.isPaid ? "Paid" : "Pending Payment"}
        </span>
      </div>

      <div className="order-grid">
        <div className="order-left">
          {/* Shipping Info */}
          <div className="order-card">
            <h2 className="order-subtitle">Shipping</h2>
            <p>
              <span className="font-medium">Address: </span>
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
                  ? `Delivered on ${new Date(
                      order.deliveredAt!
                    ).toLocaleDateString()}`
                  : "Not Delivered"}
              </span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="order-card">
            <h2 className="order-subtitle">Payment</h2>
            <p>
              <span className="font-medium">Method: </span>
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
                  ? `Paid on ${new Date(order.paidAt!).toLocaleDateString()}`
                  : "Not Paid"}
              </span>
            </div>
          </div>

          {/* Order Items - Grouped by delivery type with fixed string comparison */}
          <div className="order-card">
            <h2 className="order-subtitle">Order Items</h2>
            
            {sellerDeliveryItems.length > 0 && (
              <div className="delivery-group">
                <div className="delivery-group-header">
                  <Store className="icon" />
                  <h3>აგზავნის ავტორი</h3>
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
                        {item.qty} x {item.price.toFixed(2)} ₾ = 
                        {(item.qty * item.price).toFixed(2)} ₾
                      </p>
                      {item.product?.minDeliveryDays && item.product?.maxDeliveryDays && (
                        <p className="delivery-time">
                          მიწოდების ვადა: {item.product.minDeliveryDays}-{item.product.maxDeliveryDays} დღე
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
                  <h3>SoulArt-ის კურიერი</h3>
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
                        {item.qty} x {item.price.toFixed(2)} ₾= 
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
            <h2 className="order-subtitle">Order Summary</h2>
            <div className="order-summary">
              <div className="summary-item">
                <span>Items</span>
                <span>{order.itemsPrice.toFixed(2)} ₾</span>
              </div>
              <div className="summary-item">
                <span>Shipping</span>
                <span>
                  {order.shippingPrice === 0
                    ? "Free"
                    : `${order.shippingPrice.toFixed(2)} ₾`}
                </span>
              </div>
              <div className="summary-item">
                <span>Tax</span>
                <span>{order.taxPrice.toFixed(2)} ₾</span>
              </div>
              <hr />
              <div className="summary-total">
                <span>Total</span>
                <span>{order.totalPrice.toFixed(2)} ₾</span>
              </div>
              
              {/* დავამატოთ დოლარის ეკვივალენტი */}
              <div className="summary-total-usd">
                <span>Total (USD)</span>
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
