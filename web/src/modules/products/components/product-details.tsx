"use client";

import { useState } from "react";
import Image from "next/image";
import { StarIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewForm } from "./review-form";
import { ProductReviews } from "./product-reviews";
import { useRouter } from "next/navigation";
import "./productDetails.css";
import { Product } from "@/types";
import { AddToCartButton } from "./AddToCartButton";

interface ProductDetailsProps {
  product: Product;
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("details");
  const router = useRouter();

  if (!product) return null;

  const isOutOfStock = product.countInStock === 0;


  return (
    <div className="container">
      <div className="grid">
        {/* Left Column - Images */}
        <div className="image-section">
          <div className="image-container">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="image-wrapper"
              >
                <Image
                  src={product.images[currentImageIndex]}
                  alt={product.name}
                  fill
                  className="object-contain"
                  priority
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="thumbnail-container">
            {product.images.map((image, index) => (
              <motion.button
                key={image}
                onClick={() => setCurrentImageIndex(index)}
                className={`thumbnail ${
                  index === currentImageIndex ? "active" : ""
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Image
                  src={image}
                  alt={`${product.name} view ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right Column - Product Info */}
        <div className="product-info">
          <div className="brand-container">
            <div className="brand-details">
              <div className="brand-logo">
                <Image
                  src={product.brandLogo}
                  alt={product.brand}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-bold">{product.brand}</span>
            </div>
            <span className="text-muted">Ref: {product._id}</span>
          </div>

          <h1 className="product-title">{product.name}</h1>

          <div className="rating-container">
            <div className="rating-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-400">{product.numReviews} reviews</span>
          </div>

          <div className="price">${product.price}</div>

          <div className="separator"></div>

          <div className="stock-info">
            {isOutOfStock ? (
              <div className="text-red-500">Out of Stock</div>
            ) : (
              <div>
                <div className="text-green-600">In Stock</div>
                <label className="select-container">
                  Quantity:
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  >
                    {Array.from(
                      { length: product.countInStock },
                      (_, i) => i + 1
                    ).map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* <button
            className="add-to-cart-btn"
            disabled={isOutOfStock || loading}
            onClick={handleAddToCart}
          >
            <HiOutlineShoppingBag size={30} />
            {isOutOfStock
              ? "Out of Stock"
              : loading
              ? "Adding..."
              : "Add to Cart"}
          </button> */}
          <AddToCartButton productId={product._id} countInStock={product.countInStock} className="custom-style-2" />

          <div className="tabs">
            <div className="tabs-list">
              <button
                className={`tabs-trigger ${
                  activeTab === "details" ? "active" : ""
                }`}
                onClick={() => setActiveTab("details")}
              >
                {product.description}
              </button>
              <button
                className={`tabs-trigger ${
                  activeTab === "reviews" ? "active" : ""
                }`}
                onClick={() => setActiveTab("reviews")}
              >
                Reviews ({product.numReviews})
              </button>
            </div>

            <div
              className={`tab-content ${
                activeTab === "details" ? "active" : ""
              }`}
            >
              <div className="prose">
                <p>{product.description}</p>
              </div>
            </div>

            <div
              className={`tab-content ${
                activeTab === "reviews" ? "active" : ""
              }`}
            >
              <ReviewForm
                productId={product._id}
                onSuccess={() => router.refresh()}
              />
              <ProductReviews product={product} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
