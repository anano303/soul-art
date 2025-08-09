"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import Link from "next/link";
import { CheckCircle2, Store, Truck, XCircle, Wallet } from "lucide-react";
import { Order } from "@/types/order";
import "./ordersList.css";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { getUserData } from "@/lib/auth";
import { getSellerBalance } from "@/modules/balance/api/balance-api";

export function OrdersList() {
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const userData = getUserData();
    if (userData) {
      setUserRole(userData.role);
      setUserId(userData._id);
    }
  }, []);

  // Fetch seller balance if user is a seller
  const { data: balance } = useQuery({
    queryKey: ["seller-balance"],
    queryFn: getSellerBalance,
    enabled: userRole === "seller",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, userRole, userId],
    queryFn: async () => {
      try {
        // Backend now handles role-based filtering
        const response = await fetchWithAuth(`/orders?page=${page}&limit=50`);
        if (!response.ok) {
          console.error("Failed to fetch orders:", response.statusText);
          return { items: [], pages: 0 };
        }

        const orders = await response.json();
        console.log("Orders data:", orders);

        // Orders are already filtered by the backend based on user role
        const filteredOrders = Array.isArray(orders) ? orders : [];

        return {
          items: filteredOrders,
          pages: Math.ceil(filteredOrders.length / 8),
        };
      } catch (error) {
        console.error("Error fetching orders:", error);
        return { items: [], pages: 0 };
      }
    },
    enabled: userRole !== null, // Only run query when we have user role
  });

  if (isLoading) {
    return (
      <div className="orders-container">{<HeartLoading size="medium" />}</div>
    );
  }

  const orders = data?.items || [];
  const totalPages = data?.pages || 0;
  console.log("Rendered orders:", orders);

  return (
    <div className="orders-container">
      <div className="orders-header">
        <div className="orders-header-left">
          <h1 className="orders-title">Orders</h1>
        </div>
        {userRole === "seller" && (
          <div className="orders-header-right">
            <Link href="/profile/balance" className="balance-summary-link">
              <Wallet className="balance-icon" />
              <span>
                შენი ჯამური ბალანსია:{" "}
                {balance?.totalBalance?.toFixed(2) || "0.00"} ₾
              </span>
            </Link>
          </div>
        )}
      </div>
      {!orders || orders.length === 0 ? (
        <p>No orders found</p>
      ) : (
        <>
          <table className="orders-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>USER</th>
                <th>SELLER</th>
                <th>DATE</th>
                <th>TOTAL</th>
                <th>DELIVERY TYPE</th>
                <th>PAID</th>
                <th>DELIVERED</th>
                <th className="orders-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: Order) => (
                <tr key={order._id}>
                  <td>#{order._id}</td>
                  <td>
                    {order.user && order.user.email
                      ? order.user.email
                      : "Unknown"}
                  </td>
                  <td>
                    {/* Show first product's seller info if available */}
                    {order.orderItems && order.orderItems.length > 0 ? (
                      order.orderItems.map((item, index) => {
                        // Get brand info from product or show multiple sellers indicator
                        const productData = item.productId;
                        if (
                          typeof productData === "object" &&
                          productData?.brand
                        ) {
                          return (
                            <div key={index} className="seller-badge">
                              <Store className="icon" size={14} />
                              {productData.brand}
                            </div>
                          );
                        }
                        return index === 0 ? (
                          <div
                            key={`unknown-${index}`}
                            className="seller-badge unknown"
                          >
                            <Store className="icon" size={14} />
                            Mix Products
                          </div>
                        ) : null;
                      })
                    ) : (
                      <span className="text-muted">No seller info</span>
                    )}
                  </td>
                  <td>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString()
                      : "Unknown"}
                  </td>
                  <td>
                    {order.totalPrice ? order.totalPrice.toFixed(2) : "0.00"} ₾
                  </td>
                  <td>
                    {order.orderItems &&
                    order.orderItems.some(
                      (item) =>
                        item.productId &&
                        typeof item.productId === "object" &&
                        item.productId.deliveryType &&
                        String(item.productId.deliveryType) === "SELLER"
                    ) ? (
                      <span className="delivery-badge seller">
                        <Store className="icon" />
                        აგზავნის ავტორი
                        {order.orderItems
                          .filter(
                            (item) =>
                              item.productId &&
                              typeof item.productId === "object" &&
                              item.productId.deliveryType &&
                              String(item.productId.deliveryType) === "SELLER"
                          )
                          .map((item, itemIndex) =>
                            item.productId &&
                            typeof item.productId === "object" &&
                            item.productId.minDeliveryDays &&
                            item.productId.maxDeliveryDays ? (
                              <span
                                className="delivery-time"
                                key={`${item._id || itemIndex}-delivery`}
                              >
                                {item.productId.minDeliveryDays}-
                                {item.productId.maxDeliveryDays} დღე
                              </span>
                            ) : null
                          )}
                      </span>
                    ) : (
                      <span className="delivery-badge soulart">
                        <Truck className="icon" />
                        soulart-ის კურიერი
                      </span>
                    )}
                  </td>
                  <td>
                    {order.status === "cancelled" ? (
                      <span className="status-badge cancelled">
                        <XCircle className="icon" />
                        Cancelled
                      </span>
                    ) : order.status === "paid" || order.isPaid ? (
                      <span className="status-badge success">
                        <CheckCircle2 className="icon" />
                        {order.paidAt &&
                          new Date(order.paidAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="status-badge error">
                        <XCircle className="icon" />
                        Not Paid
                      </span>
                    )}
                  </td>
                  <td>
                    {order.isDelivered ? (
                      <span className="status-badge success">
                        <CheckCircle2 className="icon" />
                        {order.deliveredAt &&
                          new Date(order.deliveredAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="status-badge error">
                        <XCircle className="icon" />
                        Not Delivered
                      </span>
                    )}
                  </td>
                  <td className="orders-actions">
                    <Link
                      href={`/admin/orders/${order._id}`}
                      className="view-link"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
