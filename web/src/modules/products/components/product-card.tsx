"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Tag } from "lucide-react";
import "./ProductCard.css";
import { Product } from "@/types";
import { AddToCartButton } from "./AddToCartButton";
import { useCart } from "@/modules/cart/context/cart-context";
import { useToast } from "@/hooks/use-toast";
import noPhoto from "../../../assets/nophoto.webp";
import StarImg from "../../../assets/Images/star.png";
import Star2 from "../../../assets/Images/startHandMade.png";
import { useLanguage } from "@/hooks/LanguageContext";
import { trackProductInteraction, trackAddToCart } from "@/lib/ga4-analytics";
import { optimizeCloudinaryUrl } from "@/lib/utils";
import { useReferralPricing } from "@/hooks/use-referral-pricing";
import { useCurrency } from "@/hooks/use-currency";

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
  const { addToCart, isItemInCart } = useCart();
  const { toast } = useToast();
  const [isBuying, setIsBuying] = useState(false);
  const { formatPrice } = useCurrency();

  // Check for referral pricing
  const referralPricing = useReferralPricing(product);

  // ვამოწმებთ სურათის ვალიდურობას და ვოპტიმიზირებთ Cloudinary URL-ს
  const rawImage = product.images?.[0] || noPhoto.src;
  const productImage =
    optimizeCloudinaryUrl(rawImage, { width: 300, quality: "auto:eco" }) ||
    rawImage;

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

  // Determine if it's paintings category (show Artist) or handmade (show Author)
  const isPaintingsCategory =
    rawCategoryTokens.includes("ნახატ") ||
    rawCategoryTokens.includes("painting");

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

  // Calculate available stock considering variants
  const availableStock = (() => {
    // Check variants first if available
    if (product.variants && product.variants.length > 0) {
      // Check if variants have no attributes (just stock)
      const hasNoAttributes = product.variants.every(
        (v) => !v.size && !v.color && !v.ageGroup
      );
      if (hasNoAttributes) {
        // Sum all variant stocks for products without attributes
        return product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      }
      // For variants with attributes, sum all stocks
      const variantStock = product.variants.reduce(
        (sum, v) => sum + (v.stock || 0),
        0
      );
      return variantStock;
    }
    // Fall back to countInStock
    return product.countInStock ?? 0;
  })();

  const isOutOfStock = availableStock <= 0;

  // Handle Buy Now - Add to cart and redirect to checkout
  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) {
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
      // Check if item is already in cart
      const isInCart = isItemInCart(product._id);

      // Calculate the correct price to use
      const priceToUse = referralPricing.hasReferralDiscount
        ? referralPricing.referralPrice
        : isDiscounted
        ? discountedPrice
        : product.price;

      if (!isInCart) {
        // Track quick purchase action
        trackAddToCart(product._id, displayName, priceToUse, 1);

        // Prepare referral info for cart
        const referralInfo = referralPricing.hasReferralDiscount
          ? {
              originalPrice: product.price,
              hasReferralDiscount: true,
              referralDiscountPercent: referralPricing.referralDiscountPercent,
              referralDiscountAmount:
                product.price - referralPricing.referralPrice,
            }
          : undefined;

        // Add item to cart with the correct price
        await addToCart(
          product._id,
          1,
          undefined,
          undefined,
          undefined,
          priceToUse,
          referralInfo
        );
      }

      // Redirect to checkout (whether item was already in cart or just added)
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

      {/* Product image and name - clickable link to product */}
      <Link
        href={`/products/${product._id}`}
        onClick={() =>
          trackProductInteraction(product._id, "click", "product_card")
        }
      >
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
        <div className="product-info product-info-top">
          <div className="product-name-rating">
            <h3 className="product-name">{displayName}</h3>
            <div className="product-rating">
              <span style={{ marginRight: product.rating > 0 ? "5px" : "0" }}>
                <Image
                  src={theme === "handmade-theme" ? Star2 : StarImg}
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
        </div>
      </Link>

      {/* Author - separate section with product-info styling */}
      <div className="product-info">
        <p
          style={{
            margin: "3px 10px",
            fontSize: "0.85rem",
            color:
              theme === "handmade-theme" ? "var(--secondary-color)" : "#153754",
          }}
        >
          <span className="author">
            {isPaintingsCategory
              ? language === "en"
                ? "Artist: "
                : "მხატვარი: "
              : language === "en"
              ? "Author: "
              : "ავტორი: "}
          </span>
          {product.user?.artistSlug ? (
            <Link
              href={`/@${product.user.artistSlug}`}
              style={{
                color: "inherit",
              }}
            >
              {product.brand}
            </Link>
          ) : (
            product.brand
          )}

          {/* Artist Rating - Temporarily disabled */}
          {/* {product.user && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginLeft: "8px",
                padding: "2px 6px",
                background: "rgba(251, 191, 36, 0.1)",
                borderRadius: "8px",
              }}
            >
              <Star
                size={13}
                fill={
                  product.user.artistDirectRating &&
                  product.user.artistDirectRating > 0
                    ? "#fbbf24"
                    : "none"
                }
                stroke={
                  product.user.artistDirectRating &&
                  product.user.artistDirectRating > 0
                    ? "#fbbf24"
                    : "#94a3b8"
                }
                strokeWidth={2}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color:
                    product.user.artistDirectRating &&
                    product.user.artistDirectRating > 0
                      ? "#f59e0b"
                      : "#64748b",
                }}
              >
                {product.user.artistDirectRating?.toFixed(1) || "0"}
              </span>
            </span>
          )} */}
        </p>
      </div>

      {/* Price - clickable link to product */}
      <Link href={`/products/${product._id}`}>
        <div className="product-info product-info-bottom">
          <div className="product-details">
            <div className="priceAndRaiting">
              {/* Show referral pricing if applicable */}
              {referralPricing.hasReferralDiscount ? (
                <div className="price-container referral-price-container">
                  <div className="referral-badge">
                    <Tag size={12} />
                    <span>
                      {language === "en" ? "Special Price" : "სპეც. ფასი"}
                    </span>
                  </div>
                  <span
                    className="original-price"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {formatPrice(referralPricing.originalPrice, product.convertedPrices)}
                  </span>
                  {isDiscounted &&
                    referralPricing.basePrice !==
                      referralPricing.originalPrice && (
                      <span
                        className="original-price"
                        style={{
                          fontSize: "0.75rem",
                          textDecoration: "line-through",
                          opacity: 0.6,
                        }}
                      >
                        {formatPrice(referralPricing.basePrice, product.convertedDiscountedPrices)}
                      </span>
                    )}
                  <h3 className="product-price referral-final-price">
                    {formatPrice(referralPricing.referralPrice, product.convertedDiscountedPrices)}
                  </h3>
                </div>
              ) : isDiscounted ? (
                <div className="price-container">
                  <span
                    className="original-price"
                    style={{ fontSize: "0.8rem" }}
                  >
                    {formatPrice(product.price, product.convertedPrices)}
                  </span>
                  <h3 className="product-price discounted-price">
                    {formatPrice(discountedPrice, product.convertedDiscountedPrices)}
                  </h3>
                </div>
              ) : (
                <h3 className="product-price">
                  {formatPrice(product.price, product.convertedPrices)}
                </h3>
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
          countInStock={availableStock}
          className="btn-add-to-cart-icon"
          price={
            referralPricing.hasReferralDiscount
              ? referralPricing.referralPrice
              : isDiscounted
              ? discountedPrice
              : product.price
          }
          hideQuantity={true}
          openCartOnAdd={false}
          iconOnly={true}
          referralInfo={
            referralPricing.hasReferralDiscount
              ? {
                  originalPrice: product.price,
                  hasReferralDiscount: true,
                  referralDiscountPercent:
                    referralPricing.referralDiscountPercent,
                  referralDiscountAmount:
                    product.price - referralPricing.referralPrice,
                }
              : undefined
          }
        />
        <button
          onClick={handleBuyNow}
          disabled={isOutOfStock || isBuying}
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
