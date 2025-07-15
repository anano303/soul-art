"use client";

import { CheckCircle2, XCircle, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Order, OrderItem } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Color, AgeGroupItem } from "@/types";
import "./AdminOrderDetails.css";

interface AdminOrderDetailsProps {
  order: Order;
}

export function AdminOrderDetails({ order }: AdminOrderDetailsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { language, t } = useLanguage();

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
      <div className="headerOrders">
        {" "}
        <h1>{t("adminOrders.orderNumber", { id: order._id })}</h1>
        <div className="status">
          <span
            className={`badge ${
              order.status === "cancelled"
                ? "cancelled"
                : order.status === "paid" || order.isPaid
                ? "paid"
                : "pending"
            }`}
          >
            {order.status === "cancelled"
              ? t("adminOrders.cancelled")
              : order.status === "paid" || order.isPaid
              ? t("adminOrders.paid")
              : t("adminOrders.pendingPayment")}
          </span>
          {(order.status === "paid" || order.isPaid) &&
            !order.isDelivered &&
            order.status !== "cancelled" && (
              <button className="deliver-btn" onClick={markAsDelivered}>
                {t("adminOrders.markAsDelivered")}
              </button>
            )}
        </div>
      </div>

      <div className="grid-container">
        <div className="left-section">
          {/* Shipping Info */}{" "}
          <div className="card">
            <h2>{t("adminOrders.shipping")}</h2>
            <p>
              <strong>{t("adminOrders.customer")}:</strong> {order.user.name} (
              {order.user.email})
            </p>
            <p>
              <strong>{t("adminOrders.address")}:</strong>{" "}
              {order.shippingDetails.address}, {order.shippingDetails.city},{" "}
              {order.shippingDetails.postalCode},{" "}
              {order.shippingDetails.country}
            </p>
            <div className={`alert ${order.isDelivered ? "success" : "error"}`}>
              {order.isDelivered ? <CheckCircle2 /> : <XCircle />}
              <span>
                {order.isDelivered
                  ? t("adminOrders.deliveredOn", {
                      date: new Date(order.deliveredAt!).toLocaleDateString(),
                    })
                  : t("adminOrders.notDelivered")}
              </span>
            </div>
          </div>
          {/* Payment Info */}{" "}
          <div className="card">
            <h2>{t("adminOrders.payment")}</h2>
            <p>
              <strong>{t("adminOrders.method")}:</strong> {order.paymentMethod}
            </p>
            <div
              className={`alert ${
                order.status === "cancelled"
                  ? "cancelled"
                  : order.status === "paid" || order.isPaid
                  ? "success"
                  : "error"
              }`}
            >
              {order.status === "cancelled" ? (
                <XCircle />
              ) : order.status === "paid" || order.isPaid ? (
                <CheckCircle2 />
              ) : (
                <XCircle />
              )}
              <span>
                {order.status === "cancelled"
                  ? t("adminOrders.orderCancelled", {
                      reason: order.statusReason || "Unknown reason",
                    })
                  : order.status === "paid" || order.isPaid
                  ? t("adminOrders.paidOn", {
                      date: new Date(order.paidAt!).toLocaleDateString(),
                    })
                  : t("adminOrders.notPaid")}
              </span>
            </div>
          </div>
          {/* Order Items - Now grouped by delivery type with fixed logic */}{" "}
          <div className="card">
            <h2>{t("adminOrders.orderItems")}</h2>
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
                    />{" "}
                    <div>
                      <Link
                        href={`/products/${item.productId}`}
                        className="item-name"
                      >
                        {getDisplayName(item)}
                      </Link>
                      {/* Display variant information if available */}
                      {(item.size || item.color || item.ageGroup) && (
                        <div className="variant-info">
                          {item.size && (
                            <span className="variant-tag">
                              {t("adminOrders.size")}: {item.size}
                            </span>
                          )}
                          <br />
                          {item.color && (
                            <span className="variant-tag">
                              {t("adminOrders.color")}:{" "}
                              {getLocalizedColorName(item.color)}
                            </span>
                          )}
                          <br />
                          {item.ageGroup && (
                            <span className="variant-tag">
                              {t("adminOrders.age")}:{" "}
                              {getLocalizedAgeGroupName(item.ageGroup)}
                            </span>
                          )}
                        </div>
                      )}
                      <p>
                        {item.qty} x {item.price.toFixed(2)} ₾ =
                        {(item.qty * item.price).toFixed(2)} ₾
                      </p>
                      {item.product?.minDeliveryDays &&
                        item.product?.maxDeliveryDays && (
                          <p className="delivery-time">
                            {t("adminOrders.deliveryTime")}:{" "}
                            {item.product.minDeliveryDays}-
                            {item.product.maxDeliveryDays}{" "}
                            {t("adminOrders.days")}
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
                  {/* <h3>soulart-ის კურიერი</h3> */}
                </div>{" "}
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
                      {/* Display variant information if available */}
                      {(item.size || item.color || item.ageGroup) && (
                        <div className="variant-info">
                          {item.size && (
                            <span className="variant-tag">
                              {t("adminOrders.size")}: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="variant-tag">
                              {t("adminOrders.color")}:{" "}
                              {getLocalizedColorName(item.color)}
                            </span>
                          )}
                          {item.ageGroup && (
                            <span className="variant-tag">
                              {t("adminOrders.age")}:{" "}
                              {getLocalizedAgeGroupName(item.ageGroup)}
                            </span>
                          )}
                        </div>
                      )}
                      <p>
                        {item.qty} x {item.price.toFixed(2)} ₾ =
                        {(item.qty * item.price).toFixed(2)} ₾
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}{" "}
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
                    {/* Display variant information if available */}
                    {(item.size || item.color || item.ageGroup) && (
                      <div className="variant-info">
                        {item.size && (
                          <span className="variant-tag">
                            {t("adminOrders.size")}: {item.size}
                          </span>
                        )}
                        <br />
                        {item.color && (
                          <span className="variant-tag">
                            {t("adminOrders.color")}:{" "}
                            {getLocalizedColorName(item.color)}
                          </span>
                        )}
                        <br />
                        {item.ageGroup && (
                          <span className="variant-tag">
                            {t("adminOrders.age")}:{" "}
                            {getLocalizedAgeGroupName(item.ageGroup)}
                          </span>
                        )}
                      </div>
                    )}
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
            <h2>{t("adminOrders.orderSummary")}</h2>
            <div className="summary-item">
              <span>{t("adminOrders.items")}</span>
              <span>₾{order.itemsPrice.toFixed(2)}</span>
            </div>
            <div className="summary-item">
              <span>{t("adminOrders.shipping")}</span>
              <span>
                {order.shippingPrice === 0
                  ? t("cart.free")
                  : `₾${order.shippingPrice.toFixed(2)}`}
              </span>
            </div>
            <div className="summary-item">
              <span>{t("adminOrders.tax")}</span>
              <span>₾{order.taxPrice.toFixed(2)}</span>
            </div>
8
            <div className="summary-total">
              <span>{t("adminOrders.total")}</span>
              <span>₾{order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
