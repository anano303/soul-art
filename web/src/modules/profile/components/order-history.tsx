"use client";

import { CheckCircle2, Store, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import "./history.css";

// Define Order type directly to avoid potential circular imports
interface OrderType {
  _id: string;
  createdAt: string;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  orderItems: Array<{
    _id: string;
    product?: {
      deliveryType?: "SELLER" | "SoulArt";
      minDeliveryDays?: number;
      maxDeliveryDays?: number;
    };
  }>;
}

interface OrderHistoryProps {
  orders: OrderType[];
}

export function OrderHistory({ orders }: OrderHistoryProps) {
  const { t } = useLanguage();

  if (!orders || orders.length === 0) {
    return (
      <div className="order-history mt-6">
        <div className="header">
          <h2 className="title">{t("order.myOrders")}</h2>
        </div>
        <p className="no-orders">{t("order.noOrders")}</p>
      </div>
    );
  }

  return (
    <div className="order-history mt-6">
      <div className="header">
        <h2 className="title">{t("order.myOrders")}</h2>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>{t("order.id")}</th>
            <th>{t("order.date")}</th>
            <th>{t("order.total")}</th>
            {/* <th>DELIVERY</th> */}
            <th>{t("order.paid")}</th>
            <th>{t("order.delivered")}</th>
            <th className="actions">{t("order.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id}>
              <td className="order-id">#{order._id.substring(0, 8)}</td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td>{order.totalPrice.toFixed(2)} ₾ </td>
              <td>
                {order.orderItems.some(
                  (item) =>
                    item.product &&
                    String(item.product.deliveryType) === "SELLER"
                ) ? (
                  <span className="badge delivery-badge seller">
                    <Store size={14} />
                    {t("order.authorDelivery")}
                  </span>
                ) : (
                  <span className="badge delivery-badge soulart">
                    <Truck size={14} />
                    {t("order.courierDelivery")}
                  </span>
                )}
              </td>
              <td>
                {order.isPaid ? (
                  <span className="badge badge-green">
                    <CheckCircle2 className="icon" />
                    {order.paidAt &&
                      new Date(order.paidAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="badge badge-red">
                    <XCircle className="icon" />
                    {t("order.notPaid")}
                  </span>
                )}
              </td>
              <td>
                {order.isDelivered ? (
                  <span className="badge badge-default">
                    <CheckCircle2 className="icon" />
                    {order.deliveredAt &&
                      new Date(order.deliveredAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="badge badge-gray">
                    <XCircle className="icon" />
                    {t("order.notDelivered")}
                  </span>
                )}
              </td>
              <td className="actions">
                <Link href={`/orders/${order._id}`} className="view-details">
                  {t("order.viewDetails")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
