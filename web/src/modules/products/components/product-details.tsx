"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  StarIcon,
  X,
  Truck,
  Ruler,
  CheckCircle,
  Shield,
  Share2,
  Star,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewForm } from "./review-form";
import { ProductReviews } from "./product-reviews";
import { useRouter } from "next/navigation";
import "./productDetails.css";

const PRIMARY_COLOR = "#012645";
import "./ProductCard.css"; // Import ProductCard styles for button consistency
import "./videoTabs.css"; // Import new tabs styles
import { Product } from "@/types";
import Link from "next/link";
import { ShareButtons } from "@/components/share-buttons/share-buttons";
import { RoomViewer } from "@/components/room-viewer/room-viewer";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Color, AgeGroupItem } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

import { ProductGrid } from "./product-grid";
import { useCart } from "@/modules/cart/context/cart-context";
import ProductSchema from "@/components/ProductSchema";
import { AddToCartButton } from "./AddToCartButton";
import { trackViewContent } from "@/components/MetaPixel";

// Similar Products Component
function SimilarProducts({
  currentProductId,
  categoryId,
  subCategoryId,
}: {
  currentProductId: string;
  categoryId: string;
  subCategoryId: string;
}) {
  const { t } = useLanguage();

  // Helper function to determine theme based on product category
  const getProductTheme = (product: Product) => {
    const categoryName =
      typeof product.category === "string"
        ? product.category
        : product.category?.name || "";

    if (
      categoryName === "ხელნაკეთი ნივთები" ||
      categoryName === "ხელნაკეთი" ||
      categoryName === "Handmades" ||
      categoryName === "Handmade"
    ) {
      return "handmade-theme";
    }

    return "default";
  };

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ["similarProducts", subCategoryId || categoryId],
    queryFn: async () => {
      try {
        // Try subCategory first, then fall back to category
        const filterParam = subCategoryId ? "subCategory" : "mainCategory";
        const filterValue = subCategoryId || categoryId;

        if (!filterValue) {
          return { items: [] };
        }

        const searchParams = new URLSearchParams({
          page: "1",
          limit: "10",
          [filterParam]: filterValue,
        });

        const response = await fetchWithAuth(
          `/products?${searchParams.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching similar products:", error);
        return { items: [] };
      }
    },
    enabled: !!(subCategoryId || categoryId),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const allProducts = productsResponse?.items || [];
  const similarProducts = allProducts
    .filter((product: Product) => product._id !== currentProductId)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="similar-products-section">
        <h2 className="similar-products-title">
          {t("product.similarProducts")}
        </h2>
        <div className="similar-products-loading">
          <div
            className="loading-spinner"
            style={{ margin: "20px auto", textAlign: "center" }}
          >
            <div
              className="spinner"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "3px solid rgba(1, 38, 69, 0.1)",
                borderTopColor: PRIMARY_COLOR,
                animation: "spin 1s linear infinite",
                margin: "0 auto",
              }}
            ></div>
            <style jsx>{`
              @keyframes spin {
                to {
                  transform: rotate(360deg);
                }
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  if ((!subCategoryId && !categoryId) || similarProducts.length === 0) {
    return null;
  }

  return (
    <div className="similar-products-section">
      <h2 className="similar-products-title">{t("product.similarProducts")}</h2>
      <ProductGrid
        products={similarProducts}
        theme={getProductTheme(similarProducts[0])}
      />
    </div>
  );
}

interface ProductDetailsProps {
  product: Product;
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [currentProduct, setCurrentProduct] = useState<Product>(product);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("reviews");
  const [isRoomViewerOpen, setIsRoomViewerOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("");
  const [dimensions, setDimensions] = useState<{
    width?: number;
    height?: number;
    depth?: number;
  } | null>(null);
  const isViewIncrementedRef = useRef(false);
  const currentProductIdRef = useRef<string | null>(null);
  const hasTrackedViewRef = useRef(false);
  const router = useRouter();
  const { t, language } = useLanguage();

  const resolvedYoutubeEmbedUrl = useMemo(() => {
    if (product.youtubeEmbedUrl) {
      return product.youtubeEmbedUrl;
    }

    if (product.youtubeVideoUrl) {
      try {
        const youtubeUrl = new URL(product.youtubeVideoUrl);
        let videoId = "";

        if (youtubeUrl.hostname.includes("youtu.be")) {
          videoId = youtubeUrl.pathname.substring(1);
        } else {
          const paramId = youtubeUrl.searchParams.get("v");
          if (paramId) {
            videoId = paramId;
          }
        }

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      } catch (error) {
        console.error("Failed to parse YouTube URL", error);
      }
    }

    return null;
  }, [product.youtubeEmbedUrl, product.youtubeVideoUrl]);

  const hasVideo = Boolean(resolvedYoutubeEmbedUrl || product.videoDescription);

  // Determine theme based on product category
  const getThemeClass = () => {
    const categoryName =
      typeof product.category === "string"
        ? product.category
        : product.category?.name || "";

    if (
      categoryName === "ხელნაკეთი ნივთები" ||
      categoryName === "ხელნაკეთი" ||
      categoryName === "Handmades" ||
      categoryName === "Handmade"
    ) {
      return "handmade-theme";
    }

    return "default";
  };

  const themeClass = getThemeClass();

  // Fetch colors and age groups for localization
  const { data: availableColors = [] } = useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/categories/attributes/colors");
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: availableAgeGroups = [] } = useQuery<AgeGroupItem[]>({
    queryKey: ["ageGroups"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/categories/attributes/age-groups"
        );
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Display name and description based on selected language
  const displayName =
    language === "en" && product.nameEn ? product.nameEn : product.name;

  const displayDescription =
    language === "en" && product.descriptionEn
      ? product.descriptionEn
      : product.description;

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

  // Parse dimensions if they are stored as a string
  useEffect(() => {
    console.log("Product dimensions:", product.dimensions);
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

  // Initialize default selections based on product data
  useEffect(() => {
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    }
    if (product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
    if (product.ageGroups && product.ageGroups.length > 0) {
      setSelectedAgeGroup(product.ageGroups[0]);
    }
  }, [product]);

  // Increment view count when component mounts
  useEffect(() => {
    console.log("useEffect triggered for product:", product._id);

    // Check if this product has already been viewed in this session (using sessionStorage)
    const viewedProducts = new Set(
      JSON.parse(sessionStorage.getItem("viewedProducts") || "[]")
    );

    // If already viewed in this session, skip entirely
    if (viewedProducts.has(product._id)) {
      console.log("Product already viewed in session, skipping");
      return;
    }

    // Use a more robust check with a state variable to prevent double execution
    const incrementKey = `incrementing_${product._id}`;
    if (sessionStorage.getItem(incrementKey)) {
      console.log("Already incrementing this product, skipping");
      return;
    }

    // Mark as incrementing in sessionStorage (more persistent than ref)
    sessionStorage.setItem(incrementKey, "true");

    const incrementViewCount = async () => {
      console.log("Calling incrementViewCount for product:", product._id);
      try {
        const response = await fetchWithAuth(`/products/${product._id}/view`, {
          method: "POST",
        });
        console.log(
          "View increment API call completed for product:",
          product._id
        );

        // Mark this product as viewed in sessionStorage
        viewedProducts.add(product._id);
        sessionStorage.setItem(
          "viewedProducts",
          JSON.stringify([...viewedProducts])
        );

        // Remove the incrementing flag
        sessionStorage.removeItem(incrementKey);

        // Update local product state to reflect the new view count
        setCurrentProduct((prev) => ({
          ...prev,
          viewCount: (prev.viewCount || 0) + 1,
        }));
      } catch (error) {
        // Remove the incrementing flag on error
        sessionStorage.removeItem(incrementKey);
        console.warn("Failed to increment view count:", error);
      }
    };

    incrementViewCount();
  }, [product._id]);

  // Get localized color name
  const getLocalizedColorName = (colorName: string): string => {
    if (language === "en") {
      const colorObj = availableColors.find(
        (color) => color.name === colorName
      );
      return colorObj?.nameEn || colorName;
    }
    return colorName;
  };

  // Get localized age group name
  const getLocalizedAgeGroupName = (ageGroupName: string): string => {
    if (language === "en") {
      const ageGroupObj = availableAgeGroups.find(
        (ageGroup) => ageGroup.name === ageGroupName
      );
      return ageGroupObj?.nameEn || ageGroupName;
    }
    return ageGroupName;
  };

  // Check if product has active discount
  const hasActiveDiscount = () => {
    if (!product.discountPercentage || product.discountPercentage <= 0) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!product.discountStartDate && !product.discountEndDate) {
      return true;
    }

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
  const finalPrice = calculateDiscountedPrice();

  useEffect(() => {
    hasTrackedViewRef.current = false;
  }, [product._id]);

  useEffect(() => {
    if (hasTrackedViewRef.current) {
      return;
    }

    trackViewContent(displayName, product._id, finalPrice, "GEL");
    hasTrackedViewRef.current = true;
  }, [displayName, product._id, finalPrice]);

  const availableQuantity = useMemo(() => {
    let stock = product.countInStock || 0;

    if (product.variants && product.variants.length > 0) {
      const variant = product.variants.find(
        (v) =>
          (!v.size || v.size === selectedSize) &&
          (!v.color || v.color === selectedColor) &&
          (!v.ageGroup || v.ageGroup === selectedAgeGroup)
      );
      stock = variant ? variant.stock : 0;
    }

    return stock;
  }, [selectedSize, selectedColor, selectedAgeGroup, product]);

  if (!product) return null;

  // Safety check for images array
  if (
    !product.images ||
    !Array.isArray(product.images) ||
    product.images.length === 0
  ) {
    return (
      <div className="container">
        <div className="error-message">
          <p>{t("product.noImagesAvailable") || "სურათები მიუწვდომელია"}</p>
        </div>
      </div>
    );
  }

  const isOutOfStock = availableQuantity === 0;

  // Function to open fullscreen image
  const openFullscreen = () => {
    setIsFullscreenOpen(true);
  };

  // Function to close fullscreen image
  const closeFullscreen = () => {
    setIsFullscreenOpen(false);
  };

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!product.images || product.images.length <= 1) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentImageIndex(
          currentImageIndex === 0
            ? product.images.length - 1
            : currentImageIndex - 1
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentImageIndex(
          currentImageIndex === product.images.length - 1
            ? 0
            : currentImageIndex + 1
        );
      } else if (e.key === "Escape" && isFullscreenOpen) {
        closeFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentImageIndex, product.images, isFullscreenOpen]);

  return (
    <div className={`container ${themeClass}`}>
      {/* SEO Product Schema */}
      <ProductSchema product={product} productId={product._id} />

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
                onClick={openFullscreen}
              >
                {isDigitalCategory && categoryLabel && (
                  <div className="digital-category-badge detail-view">
                    <span className="digital-category-icon" aria-hidden="true">
                      ✨
                    </span>
                    <span className="digital-category-text">
                      {categoryLabel}
                    </span>
                  </div>
                )}
                {isDiscounted && product.discountPercentage && (
                  <span className="discount-badge">
                    -{product.discountPercentage}% OFF
                  </span>
                )}
                {product.images && product.images[currentImageIndex] && (
                  <Image
                    src={product.images[currentImageIndex]}
                    alt={displayName}
                    fill
                    className="object-contain"
                    loading="eager"
                  />
                )}

                {/* Zoom Indicator */}
                <div className="zoom-indicator">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                    <path d="M11 8v6" />
                    <path d="M8 11h6" />
                  </svg>
                  {language === "en" ? "Click to zoom" : "დააჭირე გასადიდებლად"}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="thumbnail-container">
            {product.images?.map(
              (image, index) =>
                image && (
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
                )
            )}
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
          {/* Product Title - First for hierarchy */}
          <h1 className="product-title">{displayName}</h1>

          {/* Brand with hover tooltip - Compact under title */}
          <Link
            href={`/shop?brand=${encodeURIComponent(product.brand)}`}
            className="brand-details"
            title={
              language === "en"
                ? `View all products by ${product.brand}`
                : `ნახე ${product.brand}-ის ყველა ნამუშევარი`
            }
          >
            {product.brandLogo && product.brandLogo.trim() !== "" ? (
              <div className="brand-logo-small">
                <Image
                  src={product.brandLogo}
                  alt={product.brand}
                  fill
                  className="object-cover"
                />
              </div>
            ) : null}
            <span className="brand-by-text">
              {language === "en" ? "by" : "ავტორი"}
            </span>
            <span className="brand-name-text">{product.brand}</span>
            <svg
              className="brand-arrow-icon"
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M6 3L11 8L6 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          {/* Enhanced Rating Section */}
          {product.numReviews > 0 && (
            <div className="rating-enhanced">
              <div className="rating-stars-enhanced">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className="star-enhanced"
                    fill={i < Math.floor(product.rating) ? "#f59e0b" : "none"}
                    stroke={
                      i < Math.floor(product.rating) ? "#f59e0b" : "#d1d5db"
                    }
                  />
                ))}
              </div>
              <div className="rating-text-enhanced">
                <div className="rating-score">{product.rating.toFixed(1)}</div>
                <div className="rating-reviews">
                  {product.numReviews}{" "}
                  {language === "en" ? "reviews" : "შეფასება"}
                </div>
              </div>
            </div>
          )}

          {/* View Counter */}
          <div className="view-counter">
            <svg
              className="view-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="view-text">
              {currentProduct.viewCount || 0}{" "}
              {language === "en" ? "views" : "ნახვა"}
            </span>
          </div>

          {/* Original/Copy Information */}
          <div className="info-section">
            <div className="info-row">
              <div className="info-icon-circle">
                <Star size={20} />
              </div>
              <div className="info-text-content">
                <div className="info-label-text">
                  {t("product.productType")}
                </div>
                <div className="info-value-text">
                  {product.isOriginal
                    ? t("product.original")
                    : t("product.copy")}
                </div>
              </div>
            </div>
          </div>

          {/* Description - Prominent with label */}
          {product.description && (
            <div className="description-section">
              <h3 className="section-label">
                {language === "en" ? "Description" : "აღწერა"}
              </h3>
              <div className="description-content">
                <p>{product.description}</p>
              </div>
            </div>
          )}

          {/* Price Section - Eye-catching */}
          <div className="price-section-modern">
            {isDiscounted ? (
              <div className="price-with-discount">
                <div className="current-price">₾{finalPrice.toFixed(2)}</div>
                <div className="price-comparison">
                  <span className="original-price-strike">
                    ₾{product.price.toFixed(2)}
                  </span>
                  <span className="discount-badge">
                    -{product.discountPercentage}%
                  </span>
                </div>
                <div className="savings-text">
                  {language === "en" ? "You save" : "დაზოგავ"} ₾
                  {(product.price - finalPrice).toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="current-price">₾{product.price.toFixed(2)}</div>
            )}
          </div>

          {/* Materials Information */}
          {product.materials && product.materials.length > 0 && (
            <div className="info-section">
              <div className="info-row">
                <div className="info-icon-circle">
                  <Package size={20} />
                </div>
                <div className="info-text-content">
                  <div className="info-label-text">
                    {t("product.materials")}
                  </div>
                  <div className="info-value-text">
                    {product.materials.join(", ")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dimensions Information - Redesigned */}
          {dimensions && (
            <div className="info-section">
              <div className="info-row">
                <div className="info-icon-circle">
                  <Ruler size={20} />
                </div>
                <div className="info-text-content">
                  <div className="info-label-text">
                    {t("product.dimensions")}
                  </div>
                  <div className="info-value-text">
                    {dimensions.width && `${dimensions.width} × `}
                    {dimensions.height && `${dimensions.height}`}
                    {dimensions.depth && ` × ${dimensions.depth}`}{" "}
                    {t("product.cm")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Original/Copy Information */}
          <div className="info-section">
            <div className="info-row">
              <div className="info-icon-circle">
                <Star size={20} />
              </div>
              <div className="info-text-content">
                <div className="info-label-text">
                  {t("product.productType")}
                </div>
                <div className="info-value-text">
                  {product.isOriginal
                    ? t("product.original")
                    : t("product.copy")}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Information - Redesigned */}
          <div className="info-section">
            <div className="info-row">
              <div className="info-icon-circle">
                <Truck size={20} />
              </div>
              <div className="info-text-content">
                <div className="info-label-text">
                  {t("product.deliveryInfo")}
                </div>
                <div className="info-value-text">
                  {product.deliveryType === "SELLER" ? (
                    <>
                      {t("product.sellerDelivery")}
                      {product.minDeliveryDays && product.maxDeliveryDays && (
                        <span className="delivery-days">
                          {" • "}
                          {product.minDeliveryDays}-{product.maxDeliveryDays}{" "}
                          {t("product.days")}
                        </span>
                      )}
                    </>
                  ) : (
                    t("product.courierDelivery")
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stock Indicator */}
          <div
            className={`stock-indicator ${
              isOutOfStock
                ? "out-of-stock"
                : availableQuantity <= 5
                ? "low-stock"
                : "in-stock"
            }`}
          >
            <div className="stock-dot"></div>
            {isOutOfStock ? (
              <span>{t("shop.outOfStock")}</span>
            ) : (
              <span>
                {language === "en" ? "In Stock" : "მარაგშია"}:{" "}
                {availableQuantity}
              </span>
            )}
          </div>

          {/* Separator - only show if product has options and is not out of stock */}
          {!isOutOfStock &&
            ((product.ageGroups && product.ageGroups.length > 0) ||
              (product.sizes && product.sizes.length > 0) ||
              (product.colors && product.colors.length > 0)) && (
              <div className="separator-modern"></div>
            )}

          {/* Product Options */}
          {!isOutOfStock && (
            <div className="options-section">
              {/* Age Group Selector */}
              {product.ageGroups && product.ageGroups.length > 0 && (
                <div className="option-selector-improved">
                  <label className="option-label-modern">
                    {t("product.selectAgeGroup")}
                  </label>
                  <select
                    className="option-select-improved"
                    value={selectedAgeGroup}
                    onChange={(e) => setSelectedAgeGroup(e.target.value)}
                  >
                    <option value="">{t("product.selectAgeGroup")}</option>
                    {product.ageGroups.map((ageGroup) => (
                      <option key={ageGroup} value={ageGroup}>
                        {getLocalizedAgeGroupName(ageGroup)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="option-selector-improved">
                  <label className="option-label-modern">
                    {t("product.selectSize")}
                  </label>
                  <select
                    className="option-select-improved"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                  >
                    <option value="">{t("product.selectSize")}</option>
                    {product.sizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Color Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="option-selector-improved">
                  <label className="option-label-modern">
                    {t("product.selectColor")}
                  </label>
                  <select
                    className="option-select-improved"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                  >
                    <option value="">{t("product.selectColor")}</option>
                    {product.colors.map((color) => (
                      <option key={color} value={color}>
                        {getLocalizedColorName(color)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Cart Actions - Quantity + Add to Cart Button */}
          {!isOutOfStock && (
            <div className="cart-actions-container">
              {/* Quantity Selector */}
              <div className="quantity-selector-wrapper">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  className="qty-input"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.min(availableQuantity, Math.max(1, val)));
                  }}
                  min="1"
                  max={availableQuantity}
                />
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() =>
                    setQuantity(Math.min(availableQuantity, quantity + 1))
                  }
                  disabled={quantity >= availableQuantity}
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <div className="add-to-cart-btn-wrapper">
                <AddToCartButton
                  productId={product._id}
                  productName={displayName}
                  countInStock={availableQuantity}
                  className="add-to-cart-btn"
                  selectedSize={selectedSize}
                  selectedColor={selectedColor}
                  selectedAgeGroup={selectedAgeGroup}
                  quantity={quantity}
                  price={finalPrice}
                  hideQuantity={true}
                />
              </div>
            </div>
          )}

          {isOutOfStock && (
            <AddToCartButton
              productId={product._id}
              productName={displayName}
              countInStock={availableQuantity}
              className="add-to-cart-btn"
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              selectedAgeGroup={selectedAgeGroup}
              quantity={quantity}
              price={finalPrice}
              hideQuantity={true}
            />
          )}

          {/* Share with Friends */}
          <div className="share-section">
            <div className="share-header">
              <Share2 size={18} />
              <span>
                {language === "en"
                  ? "Share with Friends"
                  : "გაუზიარე მეგობრებს"}
              </span>
            </div>
            <ShareButtons
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={`${displayName} by ${product.brand}`}
            />
          </div>

          <div className="tabs">
            <div className="tabs-list">
              {hasVideo && (
                <button
                  className={`tabs-trigger ${
                    activeTab === "video" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("video")}
                >
                  {language === "en" ? "Video" : "ვიდეო"}
                </button>
              )}
              <button
                className={`tabs-trigger ${
                  activeTab === "reviews" ? "active" : ""
                }`}
                onClick={() => setActiveTab("reviews")}
              >
                {t("product.reviews")} ({product.numReviews})
              </button>
            </div>

            {hasVideo && (
              <div
                className={`tab-content ${
                  activeTab === "video" ? "active" : ""
                }`}
              >
                <div className="video-container">
                  {resolvedYoutubeEmbedUrl ? (
                    <iframe
                      src={resolvedYoutubeEmbedUrl}
                      title={displayName}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      frameBorder={0}
                    />
                  ) : product.videoDescription ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: product.videoDescription,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            )}

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

      {/* Fullscreen Image Modal */}
      {isFullscreenOpen &&
        product.images &&
        product.images[currentImageIndex] && (
          <div className="fullscreen-modal" onClick={closeFullscreen}>
            <button
              className="fullscreen-close"
              onClick={(e) => {
                e.stopPropagation();
                closeFullscreen();
              }}
            >
              <X />
            </button>
            <div
              className="fullscreen-image-container"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={product.images[currentImageIndex]}
                alt={displayName}
                width={1200}
                height={1200}
                quality={100}
                className="fullscreen-image"
              />

              {/* Gallery Navigation in Fullscreen */}
              {product.images && product.images.length > 1 && (
                <>
                  <button
                    className="fullscreen-gallery-nav prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(
                        currentImageIndex === 0
                          ? product.images!.length - 1
                          : currentImageIndex - 1
                      );
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15,18 9,12 15,6" />
                    </svg>
                  </button>

                  <button
                    className="fullscreen-gallery-nav next"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(
                        currentImageIndex === product.images!.length - 1
                          ? 0
                          : currentImageIndex + 1
                      );
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      {/* Room Viewer Modal */}
      {product.images && product.images[currentImageIndex] && (
        <RoomViewer
          productImage={product.images[currentImageIndex]}
          isOpen={isRoomViewerOpen}
          onClose={() => setIsRoomViewerOpen(false)}
        />
      )}

      {/* Similar Products Section */}
      <SimilarProducts
        currentProductId={product._id}
        categoryId={
          typeof product.category === "string"
            ? product.category
            : product.category?.id || product.category?._id || ""
        }
        subCategoryId={
          typeof product.subCategory === "string"
            ? product.subCategory
            : product.subCategory?.id || product.subCategory?._id || ""
        }
      />
    </div>
  );
}
