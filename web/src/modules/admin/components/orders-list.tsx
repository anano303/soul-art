"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Order } from "@/types/order";
import "./ordersList.css";

export function OrdersList() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page],
    queryFn: async () => {
      const response = await fetchWithAuth(`/orders?page=${page}&limit=8`);
      const data = await response.json();
      console.log("Orders data:", data); // დებაგისთვის
      return {
        items: Array.isArray(data) ? data : [], // თუ მასივია პირდაპირ ვიღებთ, თუ არა ცარიელ მასივს
        pages: Math.ceil((Array.isArray(data) ? data.length : 0) / 8),
      };
    },
  });

  if (isLoading) {
    return <div className="orders-container">Loading...</div>;
  }

  const orders = data?.items || [];
  const totalPages = data?.pages || 0;
  console.log("Rendered orders:", orders); // დებაგისთვის

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1 className="orders-title">Orders</h1>
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
                <th>DATE</th>
                <th>TOTAL</th>
                <th>PAID</th>
                <th>DELIVERED</th>
                <th className="orders-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: Order) => (
                <tr key={order._id}>
                  <td>#{order._id}</td>
                  <td>{order.user.email}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>${order.totalPrice.toFixed(2)}</td>
                  <td>
                    {order.isPaid ? (
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
