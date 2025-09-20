"use client";

import Image from "next/image";
import Link from "next/link";
import "./ProductCard.css";
import { Product } from "@/types";
import { AddToCartButton } from "./AddToCartButton";
import noPhoto from "../../../assets/nophoto.webp";
import Star from "../../../assets/Images/star.png";
import Star2 from "../../../assets/Images/startHandMade.png";
import { useLanguage } from "@/hooks/LanguageContext";

interface ProductCardProps {
  product: Product;
  className?: string;
  theme?: "default" | "handmade-theme";
}

export function ProductCard({
  product,
  className = "",
  theme = "default",
}: ProductCardProps) {
  const { language } = useLanguage();

  // ვამოწმებთ სურათის ვალიდურობას
  const productImage = product.images?.[0] || noPhoto.src;

  // Display name based on selected language
  const displayName =
    language === "en" && product.nameEn ? product.nameEn : product.name;

  // Check if product has active discount
  const hasActiveDiscount = () => {
    if (!product.discountPercentage || product.discountPercentage <= 0) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If no start/end dates specified, discount is always active
    if (!product.discountStartDate && !product.discountEndDate) {
      return true;
    }

    // Check date range if specified
    const startDate = product.discountStartDate
      ? new Date(product.discountStartDate)
      : null;
    const endDate = product.discountEndDate
      ? new Date(product.discountEndDate)
      : null;

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const isAfterStart = !startDate || today >= startDate;
    const isBeforeEnd = !endDate || today <= endDate;

    return isAfterStart && isBeforeEnd;
  };

  // Calculate discounted price
  const calculateDiscountedPrice = () => {
    if (!hasActiveDiscount()) return product.price;
    const discountAmount = (product.price * product.discountPercentage!) / 100;
    return product.price - discountAmount;
  };

  const isDiscounted = hasActiveDiscount();
  const discountedPrice = calculateDiscountedPrice();

  return (
    <div className={`product-card ${theme} ${className}`}>
      {/* Discount badge */}
      {isDiscounted && (
        <div className="discount-badge">-{product.discountPercentage}%</div>
      )}

      <Link href={`/products/${product._id}`}>
        <div className="product-image">
          <Image
            src={productImage}
            alt={displayName}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            className="image"
          />
        </div>
        <div className="product-info">
          <div className="product-name-rating">
            <h3 className="product-name">{displayName}</h3>
            <div className="product-rating">
              <span style={{ marginRight: "5px" }}>
                <Image
                  src={theme === "handmade-theme" ? Star2 : Star}
                  alt="rating star"
                  width={16}
                  height={16}
                />
              </span>
              <span className="rating-text" style={{ whiteSpace: "nowrap" }}>
                {product.rating.toFixed(1)} ({product.numReviews})
              </span>
            </div>
          </div>
          <p
            style={{
              margin: "5px 15px 0px 15px",
              color:
                theme === "handmade-theme"
                  ? "var(--secondary-color)"
                  : "#153754",
            }}
          >
            <span className="author">
              {language === "en" ? "Author: " : "ავტორი: "}
            </span>
            {product.brand}
          </p>

          <div className="product-details">
            <div className="priceAndRaiting">
              {isDiscounted ? (
                <div className="price-container">
                  <span className="original-price">
                    {product.price.toFixed(2)} ₾
                  </span>
                  <h3 className="product-price discounted-price">
                    {discountedPrice.toFixed(2)} ₾
                  </h3>
                </div>
              ) : (
                <h3 className="product-price">{product.price} ₾</h3>
              )}
            </div>
          </div>
        </div>
      </Link>
      <AddToCartButton
        productId={product._id}
        countInStock={product.countInStock}
        className="addButtonCart"
      />
    </div>
  );
}
