"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { StarIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewForm } from "./review-form";
import { ProductReviews } from "./product-reviews";
import { useRouter } from "next/navigation";
import "./productDetails.css";
import { Product } from "@/types";
import { AddToCartButton } from "./AddToCartButton";
import Link from "next/link";
import { ShareButtons } from "@/components/share-buttons/share-buttons";
import { RoomViewer } from "@/components/room-viewer/room-viewer";
import { useLanguage } from "@/hooks/LanguageContext";

interface ProductDetailsProps {
  product: Product;
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("details");
  const [isRoomViewerOpen, setIsRoomViewerOpen] = useState(false);
  const [dimensions, setDimensions] = useState<{
    width?: number;
    height?: number;
    depth?: number;
  } | null>(null);
  const router = useRouter();
  const { t, language } = useLanguage();

  // Display name and description based on selected language
  const displayName =
    language === "en" && product.nameEn ? product.nameEn : product.name;

  const displayDescription =
    language === "en" && product.descriptionEn
      ? product.descriptionEn
      : product.description;

  // Parse dimensions if they are stored as a string
  useEffect(() => {
    if (!product.dimensions) {
      setDimensions(null);
      return;
    }

    try {
      if (typeof product.dimensions === "string") {
        const parsed = JSON.parse(product.dimensions);
        setDimensions(parsed);
      } else {
        setDimensions(product.dimensions);
      }
    } catch (e) {
      console.error("Error parsing dimensions:", e);
      setDimensions(null);
    }
  }, [product.dimensions]);

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
                  alt={displayName}
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
                  alt={`${displayName} view ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </motion.button>
            ))}
          </div>

          <div className="try-on-wall-container">
            <motion.button
              className="try-on-wall-btn"
              onClick={() => setIsRoomViewerOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t("product.tryInRoom")}
            </motion.button>
          </div>
        </div>

        {/* Right Column - Product Info */}
        <div className="product-info">
          <div className="brand-container">
            <Link
              href={`/shop?brand=${encodeURIComponent(product.brand)}`}
              className="brand-details hover:opacity-75 transition-opacity"
            >
              <div className="brand-logo">
                <Image
                  src={product.brandLogo}
                  alt={product.brand}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-bold">{product.brand}</span>
            </Link>
            <span className="text-muted">
              {t("product.ref")} {product._id}
            </span>
          </div>

          <h1 className="product-title">{displayName}</h1>

          <ShareButtons
            url={typeof window !== "undefined" ? window.location.href : ""}
            title={`Check out ${displayName} by ${product.brand} on SoulArt`}
          />

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
            <span className="text-gray-400">
              {product.numReviews} {t("product.reviews")}
            </span>
          </div>

          <div className="price">₾{product.price}</div>

          {/* Product Dimensions - Fixed to handle string dimensions */}
          {dimensions && (
            <div className="dimensions-info">
              <h3 className="info-title">{t("product.dimensions")}</h3>
              <div className="dimensions-details">
                {dimensions.width && <span>{dimensions.width} სმ *</span>}
                {dimensions.height && <span> {dimensions.height} სმ *</span>}
                {dimensions.depth && <span>{dimensions.depth} სმ</span>}
              </div>
            </div>
          )}

          {/* Delivery Information */}
          <div className="delivery-info">
            <h3 className="info-title">{t("product.deliveryInfo")}</h3>
            <div className="delivery-details">
              {product.deliveryType === "SELLER" ? (
                <div>
                  <p>{t("product.sellerDelivery")}</p>
                  {product.minDeliveryDays && product.maxDeliveryDays && (
                    <p className="delivery-time">
                      {t("product.deliveryTime")}: {product.minDeliveryDays}-
                      {product.maxDeliveryDays} {t("product.days")}
                    </p>
                  )}
                </div>
              ) : (
                <p>{t("product.courierDelivery")}</p>
              )}
            </div>
          </div>

          <div className="separator"></div>

          <div className="stock-info">
            {isOutOfStock ? (
              <div className="text-red-500">{t("shop.outOfStock")}</div>
            ) : (
              <div>
                <div className="text-green-600">{t("shop.inStock")}</div>
                <label className="select-container">
                  {t("product.quantity")}:
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

          <AddToCartButton
            productId={product._id}
            countInStock={product.countInStock}
            className="custom-style-2"
          />

          <div className="tabs">
            <div className="tabs-list">
              <button
                className={`tabs-trigger ${
                  activeTab === "details" ? "active" : ""
                }`}
                onClick={() => setActiveTab("details")}
              >
                {t("product.details")}
              </button>
              <button
                className={`tabs-trigger ${
                  activeTab === "reviews" ? "active" : ""
                }`}
                onClick={() => setActiveTab("reviews")}
              >
                {t("product.reviews")} ({product.numReviews})
              </button>
            </div>

            <div
              className={`tab-content ${
                activeTab === "details" ? "active" : ""
              }`}
            >
              <div className="prose">
                <p>{displayDescription}</p>
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

      {/* Room Viewer Modal */}
      <RoomViewer
        productImage={product.images[currentImageIndex]}
        isOpen={isRoomViewerOpen}
        onClose={() => setIsRoomViewerOpen(false)}
      />
    </div>
  );
}
