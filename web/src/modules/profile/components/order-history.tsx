"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Order } from "@/types/order";
import "./history.css";

interface OrderHistoryProps {
  orders: Order[];
}

export function OrderHistory({ orders }: OrderHistoryProps) {
  return (
    <div className="order-history">
      <div className="header">
        <h2 className="title">My Orders</h2>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>DATE</th>
            <th>TOTAL</th>
            <th>PAID</th>
            <th>DELIVERED</th>
            <th className="actions">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id}>
              <td className="order-id">#{order._id}</td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td>${order.totalPrice.toFixed(2)}</td>
              <td>
                {order.isPaid ? (
                  <span className="badge badge-green">
                    <CheckCircle2 className="icon" />
                    {new Date(order.paidAt!).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="badge badge-red">
                    <XCircle className="icon" />
                    Not Paid
                  </span>
                )}
              </td>
              <td>
                {order.isDelivered ? (
                  <span className="badge badge-default">
                    <CheckCircle2 className="icon" />
                    {new Date(order.deliveredAt!).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="badge badge-gray">
                    <XCircle className="icon" />
                    Not Delivered
                  </span>
                )}
              </td>
              <td className="actions">
                <Link href={`/orders/${order._id}`} className="view-details">
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
