"use client";

import { UnauthorizedError } from "@/components/errors/unauthorized-error";
import "./unauthorized-orders.css";

export default function UnauthorizedOrdersPage() {
  return (
    <div className="unauthorized-orders-page">
      <div className="unauthorized-orders-page-inner">
        <UnauthorizedError />
      </div>
    </div>
  );
}
