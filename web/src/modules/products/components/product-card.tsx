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

  return (
    <div className={`product-card ${theme} ${className}`}>
      <Link href={`/products/${product._id}`}>
        <div className="product-image">
          <Image
            src={productImage}
            alt={displayName}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
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
              color: theme === "handmade-theme" ? "#7d5a35" : "#153754",
            }}
          >
            <span className="author">{language === "en" ? "Author: " : "ავტორი: "}</span>
            {product.brand}
          </p>

          <div className="product-details">
            <div className="priceAndRaiting">
              <h3 className="product-price">{product.price} ₾ </h3>
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
