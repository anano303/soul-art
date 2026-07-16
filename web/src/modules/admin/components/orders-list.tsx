"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import Link from "next/link";
import {
  CheckCircle2,
  Store,
  Truck,
  XCircle,
  Wallet,
  Heart,
  Tag,
  Gavel,
  ShoppingBag,
  Palette,
} from "lucide-react";
import { Order } from "@/types/order";
import "./orders-list.css";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { getUserData } from "@/lib/auth";
import { getSellerBalance } from "@/modules/balance/api/balance-api";
import { DonationModal } from "@/components/donation/DonationModal";

interface OrdersListProps {
  salesManagerMode?: boolean;
  auctionAdminMode?: boolean;
}

export function OrdersList({
  salesManagerMode = false,
  auctionAdminMode = false,
}: OrdersListProps) {
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showDonation, setShowDonation] = useState(false);
  const [orderTypeTab, setOrderTypeTab] = useState<
    "regular" | "auction" | "commission"
  >(auctionAdminMode ? "auction" : "regular");

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
    queryKey: [
      "orders",
      page,
      userRole,
      userId,
      salesManagerMode,
      auctionAdminMode,
      orderTypeTab,
    ],
    queryFn: async () => {
      try {
        // Sales Manager gets orders from their referrals
        if (salesManagerMode) {
          const response = await fetchWithAuth(
            `/sales-commission/my-commissions?page=${page}&limit=50`,
          );
          if (!response.ok) {
            console.error("Failed to fetch sales orders:", response.statusText);
            return { items: [], pages: 0 };
          }
          const data = await response.json();
          // Transform commissions to order format
          const orders = (data.commissions || []).map((c: any) => ({
            ...c.order,
            _id: c.order._id || c.order,
            commissionAmount: c.commissionAmount,
            commissionStatus: c.status,
          }));
          return {
            items: orders,
            pages: data.pages || 1,
          };
        }

        // Backend now handles role-based filtering
        const orderTypeParam = auctionAdminMode ? "auction" : orderTypeTab;
        const response = await fetchWithAuth(
          `/orders?page=${page}&limit=50&orderType=${orderTypeParam}`,
        );
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

  // შეკვეთის თანხის გამოსათვლელად სელერისა და აუქციონ ადმინისთვის
  // მიტანის ფასი გამოიკლება რადგან საკომისიო პროდუქტის ფასიდან იანგარიშება, არა მიტანიდან
  // მიტანის ფასს მომხმარებელი იხდის, მაგრამ სელერს/აუქციონ ადმინს ბალანსიდან აკლდება
  const getDisplayTotal = (order: Order): number => {
    const shippingPrice = (order as any).shippingPrice || 0;

    // ადმინისთვის სრული ფასი (მიტანიანად)
    if (userRole === "admin" && !auctionAdminMode) {
      return order.totalPrice || 0;
    }

    // სელერისთვის და აუქციონ ადმინისთვის - გამოაკელი მიტანის ფასი
    // რადგან საკომისიო პროდუქტის ფასიდან იანგარიშება
    if (userRole === "seller" || auctionAdminMode) {
      return (order.totalPrice || 0) - shippingPrice;
    }

    return order.totalPrice || 0;
  };

  return (
    <div className="orders-container">
      <div className="orders-header">
        <div className="orders-header-left">
          <h1 className="orders-title">Orders</h1>
          {/* Order type tabs - only show for admin, not for auction_admin or sales manager */}
          {!auctionAdminMode && !salesManagerMode && userRole === "admin" && (
            <div className="orders-tabs">
              <button
                className={`orders-tab ${orderTypeTab === "regular" ? "active" : ""}`}
                onClick={() => {
                  setOrderTypeTab("regular");
                  setPage(1);
                }}
              >
                <ShoppingBag size={16} />
                ჩვეულებრივი
              </button>
              <button
                className={`orders-tab ${orderTypeTab === "auction" ? "active" : ""}`}
                onClick={() => {
                  setOrderTypeTab("auction");
                  setPage(1);
                }}
              >
                <Gavel size={16} />
                აუქციონის
              </button>
              <button
                className={`orders-tab ${orderTypeTab === "commission" ? "active" : ""}`}
                onClick={() => {
                  setOrderTypeTab("commission");
                  setPage(1);
                }}
              >
                <Palette size={16} />
                ინდივიდუალური
              </button>
            </div>
          )}
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
            <button
              onClick={() => setShowDonation(true)}
              className="donation-btn"
            >
              <Heart className="donation-icon" />
              <span>მხარი დაუჭირე SoulArt-ს</span>
            </button>
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
                {userRole === "admin" && <th>SALES REF</th>}
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
                  <td>
                    #{order._id}
                    {order.orderType === "auction" && (
                      <span className="auction-badge">#აუქციონი</span>
                    )}
                    {order.orderType === "commission" && (
                      <span className="auction-badge">#ინდ.შეკვეთა</span>
                    )}
                  </td>
                  <td>
                    {order.user ? (
                      <div className="user-info">
                        <div className="user-name">
                          {order.user.name || "Unknown User"}
                        </div>
                        {order.user.phoneNumber && (
                          <div className="user-phone">
                            📞 {order.user.phoneNumber}
                          </div>
                        )}
                        <div className="user-email">
                          📧 {order.user.email || "No email"}
                        </div>
                      </div>
                    ) : (
                      "Unknown"
                    )}
                  </td>
                  <td>
                    {/* Show seller info - for auction orders from auctionId, for regular from orderItems */}
                    {order.orderType === "commission" ? (
                      <Link
                        href="/admin/commissions"
                        className="seller-info seller-link"
                      >
                        <div className="seller-name">
                          <Palette className="icon" size={14} />
                          {(order as any).seller?.storeName ||
                            (order as any).seller?.name ||
                            order.orderItems?.[0]?.name ||
                            "ინდ. შეკვეთა"}
                        </div>
                        {(order as any).seller?.email && (
                          <div className="seller-email">
                            📧 {(order as any).seller.email}
                          </div>
                        )}
                        {(order as any).seller?.phoneNumber && (
                          <div className="seller-phone">
                            📞 {(order as any).seller.phoneNumber}
                          </div>
                        )}
                      </Link>
                    ) : order.orderType === "auction" &&
                      order.auctionId?.seller ? (
                      <Link
                        href={`/admin/users/${order.auctionId.seller._id}/edit`}
                        className="seller-info seller-link"
                      >
                        <div className="seller-name">
                          <Gavel className="icon" size={14} />
                          {order.auctionId.seller.storeName ||
                            order.auctionId.seller.name ||
                            "Unknown Artist"}
                        </div>
                        {order.auctionId.seller.email && (
                          <div className="seller-email">
                            📧 {order.auctionId.seller.email}
                          </div>
                        )}
                        {order.auctionId.seller.phoneNumber && (
                          <div className="seller-phone">
                            📞 {order.auctionId.seller.phoneNumber}
                          </div>
                        )}
                      </Link>
                    ) : order.orderItems && order.orderItems.length > 0 ? (
                      (() => {
                        const firstProductData = order.orderItems[0].productId;
                        if (
                          typeof firstProductData === "object" &&
                          firstProductData?.user
                        ) {
                          const seller = firstProductData.user;
                          return (
                            <Link
                              href={`/admin/users/${seller._id}/edit`}
                              className="seller-info seller-link"
                            >
                              <div className="seller-name">
                                <Store className="icon" size={14} />
                                {seller.storeName ||
                                  seller.name ||
                                  "Unknown Seller"}
                              </div>
                              {seller.phoneNumber && (
                                <div className="seller-phone">
                                  📞 {seller.phoneNumber}
                                </div>
                              )}
                              {firstProductData.brand && (
                                <div className="seller-brand">
                                  🏷️ {firstProductData.brand}
                                </div>
                              )}
                            </Link>
                          );
                        }
                        return (
                          <div className="seller-badge unknown">
                            <Store className="icon" size={14} />
                            No seller info
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-muted">No products</span>
                    )}
                  </td>
                  {userRole === "admin" && (
                    <td>
                      {(order as any).salesManager ? (
                        <div className="sales-manager-info">
                          <div className="sales-manager-name">
                            {(order as any).salesManager.name}
                          </div>
                          <div className="sales-manager-email">
                            {(order as any).salesManager.email}
                          </div>
                          <code className="sales-ref-badge small">
                            {(order as any).salesRefCode}
                          </code>
                        </div>
                      ) : (order as any).salesRefCode ? (
                        <code className="sales-ref-badge">
                          {(order as any).salesRefCode}
                        </code>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  )}
                  <td>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString()
                      : "Unknown"}
                  </td>
                  <td>
                    <div className="price-cell">
                      {/* სელერისთვის და აუქციონ ადმინისთვის რეგიონის მიტანის გარეშე */}
                      {getDisplayTotal(order).toFixed(2)} ₾
                      {(order as any).hasReferralDiscount && (
                        <span
                          className="referral-discount-badge"
                          title={`რეფერალ ფასდაკლება: ${((order as any).totalReferralDiscount || 0).toFixed(2)} ₾`}
                        >
                          <Tag size={12} />-
                          {((order as any).totalReferralDiscount || 0).toFixed(
                            2,
                          )}{" "}
                          ₾
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {order.orderItems &&
                    order.orderItems.some(
                      (item) =>
                        item.productId &&
                        typeof item.productId === "object" &&
                        item.productId.deliveryType &&
                        String(item.productId.deliveryType) === "SELLER",
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
                              String(item.productId.deliveryType) === "SELLER",
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
                            ) : null,
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
                    {salesManagerMode || auctionAdminMode ? (
                      <span
                        className="view-link disabled"
                        title="დეტალების ნახვა მხოლოდ ადმინისთვისაა ხელმისაწვდომი"
                      >
                        Details
                      </span>
                    ) : (
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="view-link"
                      >
                        Details
                      </Link>
                    )}
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

      <DonationModal
        isOpen={showDonation}
        onClose={() => setShowDonation(false)}
      />
    </div>
  );
}
