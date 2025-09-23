"use client";

import { CheckCircle2, XCircle, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Order, OrderItem } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/hooks/LanguageContext";
import "./AdminOrderDetails.css";

interface AdminOrderDetailsProps {
  order: Order;
}

export function AdminOrderDetails({ order }: AdminOrderDetailsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { language } = useLanguage();

  // Helper function to get display name based on language
  const getDisplayName = (item: OrderItem) => {
    return language === "en" && item.nameEn ? item.nameEn : item.name;
  };

  // Group order items by delivery type with fixed logic for string comparison
  const sellerDeliveryItems = order.orderItems.filter(
    (item) => item.product && String(item.product.deliveryType) === "SELLER"
  );

  const soulartDeliveryItems = order.orderItems.filter(
    (item) => !item.product || String(item.product.deliveryType) !== "SELLER"
  );

  const markAsDelivered = async () => {
    try {
      await apiClient.put(`/orders/${order._id}/deliver`);
      toast({ title: "Success", description: "Order marked as delivered" });
      router.refresh();
    } catch (error: unknown) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to mark order as delivered",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="admin-order-details">
      <div className="header">
        <h1>Order #{order._id}</h1>
        <div className="status">
          <span className={`badge ${order.isPaid ? "paid" : "pending"}`}>
            {order.isPaid ? "Paid" : "Pending Payment"}
          </span>
          {order.isPaid && !order.isDelivered && (
            <button className="deliver-btn" onClick={markAsDelivered}>
              Mark as Delivered
            </button>
          )}
        </div>
      </div>

      <div className="grid-container">
        <div className="left-section">
          {/* Shipping Info */}
          <div className="card">
            <h2>Shipping</h2>
            <p>
              <strong>Customer:</strong> {order.user.name} ({order.user.email})
            </p>
            <p>
              <strong>Address:</strong> {order.shippingDetails.address},{" "}
              {order.shippingDetails.city}, {order.shippingDetails.postalCode},{" "}
              {order.shippingDetails.country}
            </p>
            <div className={`alert ${order.isDelivered ? "success" : "error"}`}>
              {order.isDelivered ? <CheckCircle2 /> : <XCircle />}
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
          <div className="card">
            <h2>Payment</h2>
            <p>
              <strong>Method:</strong> {order.paymentMethod}
            </p>
            <div className={`alert ${order.isPaid ? "success" : "error"}`}>
              {order.isPaid ? <CheckCircle2 /> : <XCircle />}
              <span>
                {order.isPaid
                  ? `Paid on ${new Date(order.paidAt!).toLocaleDateString()}`
                  : "Not Paid"}
              </span>
            </div>
          </div>

          {/* Order Items - Now grouped by delivery type with fixed logic */}
          <div className="card">
            <h2>Order Items</h2>

            {sellerDeliveryItems.length > 0 && (
              <div className="delivery-group">
                <div className="delivery-group-header">
                  <Store size={18} />
                  <h3>აგზავნის ავტორი</h3>
                </div>
                {sellerDeliveryItems.map((item) => (
                  <div key={item.productId} className="order-item">
                    <Image
                      src={item.image}
                      alt={getDisplayName(item)}
                      width={80}
                      height={80}
                      className="item-image"
                    />
                    <div>
                      <Link
                        href={`/products/${item.productId}`}
                        className="item-name"
                      >
                        {getDisplayName(item)}
                      </Link>
                      <p>
                        {item.qty} x ${item.price.toFixed(2)} = $
                        {(item.qty * item.price).toFixed(2)}
                      </p>
                      {item.product?.minDeliveryDays &&
                        item.product?.maxDeliveryDays && (
                          <p className="delivery-time">
                            მიწოდების ვადა: {item.product.minDeliveryDays}-
                            {item.product.maxDeliveryDays} დღე
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
                  <Truck size={18} />
                  <h3>SoulArt-ის კურიერი</h3>
                </div>
                {soulartDeliveryItems.map((item) => (
                  <div key={item.productId} className="order-item">
                    <Image
                      src={item.image}
                      alt={getDisplayName(item)}
                      width={80}
                      height={80}
                      className="item-image"
                    />
                    <div>
                      <Link
                        href={`/products/${item.productId}`}
                        className="item-name"
                      >
                        {getDisplayName(item)}
                      </Link>
                      <p>
                        {item.qty} x ${item.price.toFixed(2)} = $
                        {(item.qty * item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* If there are no delivery type groups, show items normally */}
            {sellerDeliveryItems.length === 0 &&
              soulartDeliveryItems.length === 0 &&
              order.orderItems.map((item) => (
                <div key={item.productId} className="order-item">
                  <Image
                    src={item.image}
                    alt={getDisplayName(item)}
                    width={80}
                    height={80}
                    className="item-image"
                  />
                  <div>
                    <Link
                      href={`/products/${item.productId}`}
                      className="item-name"
                    >
                      {getDisplayName(item)}
                    </Link>
                    <p>
                      {item.qty} x ${item.price.toFixed(2)} = $
                      {(item.qty * item.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="right-section">
          <div className="card">
            <h2>Order Summary</h2>
            <div className="summary-item">
              <span>Items</span>
              <span>₾{order.itemsPrice.toFixed(2)}</span>
            </div>
            <div className="summary-item">
              <span>Shipping</span>
              <span>
                {order.shippingPrice === 0
                  ? "Free"
                  : `₾${order.shippingPrice.toFixed(2)}`}
              </span>
            </div>
            <div className="summary-item">
              <span>Tax</span>
              <span>₾{order.taxPrice.toFixed(2)}</span>
            </div>
            <hr />
            <div className="summary-total">
              <span>Total</span>
              <span>₾{order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
