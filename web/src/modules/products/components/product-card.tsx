"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./ProductCard.css";
import { Product } from "@/types";
import { AddToCartButton } from "./AddToCartButton";
import { useCart } from "@/modules/cart/context/cart-context";
import { useToast } from "@/hooks/use-toast";
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
  const router = useRouter();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isBuying, setIsBuying] = useState(false);

  // ვამოწმებთ სურათის ვალიდურობას
  const productImage = product.images?.[0] || noPhoto.src;

  // Display name based on selected language
  const displayName =
    language === "en" && product.nameEn ? product.nameEn : product.name;

  const getLocalizedName = (
    value?:
      | string
      | {
          name?: string | null;
          nameEn?: string | null;
        }
      | null
  ) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return language === "en"
      ? value.nameEn || value.name || ""
      : value.name || value.nameEn || "";
  };

  const getRawName = (
    value?:
      | string
      | {
          name?: string | null;
          nameEn?: string | null;
        }
      | null
  ) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value.name || value.nameEn || "";
  };

  const categoryLabel =
    getLocalizedName(product.subCategory) ||
    getLocalizedName(product.category) ||
    getLocalizedName(product.mainCategory);

  const rawCategoryTokens = [
    getRawName(product.category),
    getRawName(product.mainCategory),
    getRawName(product.subCategory),
    getLocalizedName(product.category),
    getLocalizedName(product.mainCategory),
    getLocalizedName(product.subCategory),
    product.categoryStructure?.main || "",
    product.categoryStructure?.sub || "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isDigitalCategory =
    rawCategoryTokens.includes("ციფრ") || rawCategoryTokens.includes("digital");

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

  // Handle Buy Now - Add to cart and redirect to checkout
  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.countInStock <= 0) {
      toast({
        title: language === "en" ? "Out of Stock" : "არ არის მარაგში",
        description:
          language === "en"
            ? "This product is currently out of stock"
            : "პროდუქტი ამჟამად არ არის მარაგში",
        variant: "destructive",
      });
      return;
    }

    setIsBuying(true);

    try {
      // Add item to cart with discounted price if applicable
      await addToCart(
        product._id,
        1,
        undefined,
        undefined,
        undefined,
        isDiscounted ? discountedPrice : product.price
      );

      // Small delay to ensure cart updates, then redirect
      setTimeout(() => {
        router.push("/checkout/streamlined");
      }, 300);
    } catch (error) {
      console.error("Buy now error:", error);
      setIsBuying(false);
      // Error toast is already shown by addToCart if there's an issue
      // Only show additional error if user is not being redirected to login
      if (
        error instanceof Error &&
        error.message !== "User not authenticated"
      ) {
        toast({
          title: language === "en" ? "Error" : "შეცდომა",
          description:
            language === "en"
              ? "Failed to proceed to checkout"
              : "გადახდის გვერდზე გადასვლა ვერ მოხერხდა",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className={`product-card ${theme} ${className}`}>
      {/* Discount badge */}
      {isDiscounted && (
        <div className="discount-badge">-{product.discountPercentage}%</div>
      )}

      <Link href={`/products/${product._id}`}>
        <div className="product-image">
          {isDigitalCategory && categoryLabel && (
            <div className="digital-category-badge">
              <span className="digital-category-icon" aria-hidden="true">
                ✨
              </span>
              <span className="digital-category-text">{categoryLabel}</span>
            </div>
          )}
          <Image
            src={productImage}
            alt={displayName}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            className="image"
          />
          <div className="product-card-overlay"></div>
        </div>
        <div className="product-info">
          <div className="product-name-rating">
            <h3 className="product-name">{displayName}</h3>
            <div className="product-rating">
              <span style={{ marginRight: product.rating > 0 ? "5px" : "0" }}>
                <Image
                  src={theme === "handmade-theme" ? Star2 : Star}
                  alt="rating star"
                  width={16}
                  height={16}
                />
              </span>
              {product.rating > 0 && (
                <span className="rating-text" style={{ whiteSpace: "nowrap" }}>
                  {product.rating.toFixed(1)} ({product.numReviews})
                </span>
              )}
            </div>
          </div>
          <p
            style={{
              margin: "3px 10px",
              fontSize: "0.85rem",
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
                  <span
                    className="original-price"
                    style={{ fontSize: "0.8rem" }}
                  >
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

      {/* Product card actions - Compact Add to Cart icon + Buy Now button */}
      <div className="product-card-actions">
        <AddToCartButton
          productId={product._id}
          productName={displayName}
          countInStock={product.countInStock}
          className="btn-add-to-cart-icon"
          price={isDiscounted ? discountedPrice : product.price}
          hideQuantity={true}
          openCartOnAdd={false}
          iconOnly={true}
        />
        <button
          onClick={handleBuyNow}
          disabled={product.countInStock <= 0 || isBuying}
          className="btn-buy-now"
          title={
            language === "en"
              ? "Buy now - Direct to checkout"
              : "იყიდე ახლავე - პირდაპირ გადახდაზე"
          }
        >
          {isBuying ? (
            <>
              <svg
                className="spinner-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>
                {language === "en" ? "Processing..." : "დამუშავება..."}
              </span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
              <span>{language === "en" ? "Buy Now" : "იყიდე ახლავე"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
