import { OrdersClient } from "./orders-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order History | Soul Art",
  description: "View your order history",
};

export default function OrdersPage() {
  return <OrdersClient />;
}
