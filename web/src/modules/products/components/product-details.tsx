"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { StarIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewForm } from "./review-form";
import { ProductReviews } from "./product-reviews";
import { useRouter } from "next/navigation";
import "./productDetails.css";
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

import { SimilarProductCard } from "./similar-product-card";
import { useCart } from "@/modules/cart/context/cart-context";
import ProductSchema from "@/components/ProductSchema";

// Enhanced AddToCartButton with variant support
function EnhancedAddToCartButton({
  productId,
  countInStock = 0,
  className = "",
  selectedSize = "",
  selectedColor = "",
  selectedAgeGroup = "",
  quantity = 1,
  disabled = false,
  price,
}: {
  productId: string;
  countInStock?: number;
  className?: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedAgeGroup?: string;
  quantity?: number;
  disabled?: boolean;
  price?: number;
}) {
  const [pending, setPending] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { addToCart } = useCart();
  const { t } = useLanguage();

  const handleClick = async () => {
    setPending(true);
    try {
      await addToCart(
        productId,
        quantity,
        selectedSize,
        selectedColor,
        selectedAgeGroup,
        price
      );

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error("Add to cart error:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage !== "User not authenticated") {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to add to cart",
          variant: "destructive",
        });
      }
    } finally {
      setPending(false);
    }
  };

  if (countInStock === 0 || disabled) {
    return (
      <button className={`addButtonCart out-of-stock ${className}`} disabled>
        {t("shop.outOfStock") || "არ არის მარაგში"}
      </button>
    );
  }

  return (
    <>
      {showSuccessMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "15px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
            fontSize: "16px",
            fontWeight: "500",
            animation: "slideIn 0.3s ease-out",
          }}
        >
          ✅ {t("product.addToCartSuccess")}
        </div>
      )}

      <button
        className={`addButtonCart ${className}`}
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            <span>+</span>
            {t("cart.addToCart") || "კალათაში დამატება"}
          </>
        )}
      </button>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

// Similar Products Component
function SimilarProducts({
  currentProductId,
  subCategoryId,
}: {
  currentProductId: string;
  subCategoryId: string;
}) {
  const { t } = useLanguage();

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ["similarProducts", subCategoryId],
    queryFn: async () => {
      try {
        if (!subCategoryId) {
          return { items: [] };
        }

        const searchParams = new URLSearchParams({
          page: "1",
          limit: "10",
          subCategory: subCategoryId,
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
    enabled: !!subCategoryId,
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
                borderTopColor: "#012645",
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

  if (!subCategoryId || similarProducts.length === 0) {
    return null;
  }

  return (
    <div className="similar-products-section">
      <h2 className="similar-products-title">{t("product.similarProducts")}</h2>
      <div className="similar-products-grid">
        {similarProducts.map((product: Product) => (
          <SimilarProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}

interface ProductDetailsProps {
  product: Product;
}

export function ProductDetails({ product }: ProductDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("details");
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
  const router = useRouter();
  const { t, language } = useLanguage();

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
          <div className="brand-container">
            <Link
              href={`/shop?brand=${encodeURIComponent(product.brand)}`}
              className="brand-details hover:opacity-75 transition-opacity"
            >
              {product.brandLogo && product.brandLogo.trim() !== "" ? (
                <div className="brand-logo">
                  <Image
                    src={product.brandLogo}
                    alt={product.brand}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  No Logo
                </div>
              )}
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

          {/* Price Section with Discount Support */}
          <div className="price-section">
            {isDiscounted ? (
              <div className="price-container">
                {/* {product.discountPercentage && (
                  <span className="discount-badge">
                    -{product.discountPercentage}% OFF
                  </span>
                )} */}
                <span className="original-price">
                  ₾{product.price.toFixed(2)}
                </span>
                <span className="price discounted-price">
                  ₾{finalPrice.toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="price">₾{product.price}</div>
            )}
          </div>

          {/* Product Dimensions */}
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

          {/* Product Options */}
          {!isOutOfStock && (
            <div className="product-options-container">
              {/* Age Group Selector */}
              {product.ageGroups && product.ageGroups.length > 0 && (
                <div className="select-container">
                  <select
                    className="option-select"
                    value={selectedAgeGroup}
                    onChange={(e) => setSelectedAgeGroup(e.target.value)}
                    disabled={isOutOfStock}
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
                <div className="select-container">
                  <select
                    className="option-select"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    disabled={isOutOfStock}
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
                <div className="select-container">
                  <select
                    className="option-select"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    disabled={isOutOfStock}
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

          {/* Stock and Quantity */}
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
                      { length: availableQuantity },
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

          <EnhancedAddToCartButton
            productId={product._id}
            countInStock={availableQuantity}
            className="custom-style-2"
            selectedSize={selectedSize}
            selectedColor={selectedColor}
            selectedAgeGroup={selectedAgeGroup}
            quantity={quantity}
            price={finalPrice}
            disabled={
              availableQuantity <= 0 ||
              (product.sizes && product.sizes.length > 0 && !selectedSize) ||
              (product.colors && product.colors.length > 0 && !selectedColor) ||
              (product.ageGroups &&
                product.ageGroups.length > 0 &&
                !selectedAgeGroup)
            }
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
              {product.videoDescription && (
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

            <div
              className={`tab-content ${
                activeTab === "details" ? "active" : ""
              }`}
            >
              <div className="prose">
                <p>{displayDescription}</p>
              </div>
            </div>

            {product.videoDescription && (
              <div
                className={`tab-content ${
                  activeTab === "video" ? "active" : ""
                }`}
              >
                <div className="video-container">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: product.videoDescription,
                    }}
                  />
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
          <div
            className="fullscreen-modal"
            onClick={closeFullscreen}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              backdropFilter: "blur(20px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
            }}
          >
            <button
              className="fullscreen-close"
              onClick={(e) => {
                e.stopPropagation();
                closeFullscreen();
              }}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "white",
                fontSize: "24px",
                transition: "all 0.3s ease",
                zIndex: 10000,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <X />
            </button>
            <div
              className="fullscreen-image-container"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                maxWidth: "95vw",
                maxHeight: "95vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                src={product.images[currentImageIndex]}
                alt={displayName}
                width={1200}
                height={1200}
                quality={100}
                className="fullscreen-image"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                }}
              />
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
        subCategoryId={
          typeof product.subCategory === "string"
            ? product.subCategory
            : product.subCategory?.id || product.subCategory?._id || ""
        }
      />
    </div>
  );
}
