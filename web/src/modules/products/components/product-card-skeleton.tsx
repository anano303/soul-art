import React from "react";
import "./ProductCardSkeleton.css";

export function ProductCardSkeleton() {
  return (
    <div className="product-card-skeleton">
      <div className="product-image-skeleton" />
      <div className="product-info-skeleton">
        <div className="product-details-skeleton">
          <div className="skeleton title" />
          <div className="skeleton subtitle" />
          <div className="skeleton price" />
        </div>
      </div>
      <div className="cart-actions-skeleton">
        <div className="skeleton qty" />
        <div className="skeleton button" />
      </div>
    </div>
  );
}
