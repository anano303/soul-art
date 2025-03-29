"use client";

import Image from "next/image";
import Link from "next/link";
import "./ProductCard.css";
import { Product } from "@/types";
import { AddToCartButton } from "./AddToCartButton";
import noPhoto from "../../../assets/nophoto.webp";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  // ვამოწმებთ სურათის ვალიდურობას
  const productImage = product.images?.[0] || noPhoto.src;

  return (
    <div className="product-card">
      <Link href={`/products/${product._id}`}>
        <div className="product-image">
          <Image
            src={productImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            className="image"
          />
        </div>
        <div className="product-info">
          <div className="product-name-rating">
          <h3 className="product-name">{product.name}</h3>
          <div className="product-rating">
                <span>⭐</span>
                <span className="rating-text" style={{ whiteSpace: "nowrap" }}>
                  {product.rating.toFixed(1)} ({product.numReviews})
                </span>
              </div>
              </div>
              <p style={{ margin: "5px 15px 0px 15px", color:"#153754" }}>{product.brand}</p>
             
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
