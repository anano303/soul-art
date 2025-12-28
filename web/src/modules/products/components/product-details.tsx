"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { StarIcon, X, Truck, Ruler, Package, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewForm } from "./review-form";
import { ProductReviews } from "./product-reviews";
import { useRouter } from "next/navigation";
import "./productDetails.scss";

const PRIMARY_COLOR = "#012645";
import "./ProductCard.css"; // Import ProductCard styles for button consistency
import "./videoTabs.css"; // Import new tabs styles
import { Product, MainCategory } from "@/types";
import Link from "next/link";
import { ShareButton } from "@/components/share-button/share-button";
import { RoomViewer } from "@/components/room-viewer/room-viewer";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Color, AgeGroupItem } from "@/types";
import { optimizeCloudinaryUrl } from "@/lib/utils";

import { ProductGrid } from "./product-grid";
import ProductSchema from "@/components/ProductSchema";
import { AddToCartButton } from "./AddToCartButton";
import { trackViewContent } from "@/components/MetaPixel";
import { useCart } from "@/modules/cart/context/cart-context";
import { useToast } from "@/hooks/use-toast";
import { trackAddToCart } from "@/lib/ga4-analytics";

type MediaItem =
  | {
      type: "video";
      source: string;
      thumbnail: string | null;
    }
  | {
      type: "image";
      source: string;
      thumbnail: string;
    };

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
  const [isBuying, setIsBuying] = useState(false);
  const hasTrackedViewRef = useRef(false);
  const router = useRouter();
  const { t, language } = useLanguage();
  const { addToCart, isItemInCart } = useCart();
  const { toast } = useToast();

  const { resolvedYoutubeEmbedUrl, videoId } = useMemo(() => {
    let embedUrl: string | null = null;
    let extractedVideoId = "";

    const extractIdFromUrl = (url: string) => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname.includes("youtu.be")) {
          return parsed.pathname.replace("/", "").split("/")[0];
        }
        const pathIdMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
        if (pathIdMatch && pathIdMatch[1]) {
          return pathIdMatch[1];
        }
        const vParam = parsed.searchParams.get("v");
        return vParam || "";
      } catch (error) {
        console.error("Failed to parse YouTube URL", error);
        return "";
      }
    };

    if (product.youtubeEmbedUrl) {
      embedUrl = product.youtubeEmbedUrl;
      extractedVideoId = extractIdFromUrl(product.youtubeEmbedUrl);
    }

    if (!embedUrl && product.youtubeVideoUrl) {
      const id = extractIdFromUrl(product.youtubeVideoUrl);
      if (id) {
        embedUrl = `https://www.youtube.com/embed/${id}`;
        extractedVideoId = id;
      }
    }

    return { resolvedYoutubeEmbedUrl: embedUrl, videoId: extractedVideoId };
  }, [product.youtubeEmbedUrl, product.youtubeVideoUrl]);

  const previewYoutubeUrl = useMemo(() => {
    if (!videoId) {
      return null;
    }

    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "0",
      loop: "1",
      playlist: videoId,
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
    });

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

  const hasVideo = Boolean(resolvedYoutubeEmbedUrl || product.videoDescription);

  const mediaItems = useMemo<MediaItem[]>(() => {
    const items: MediaItem[] = [];

    if (resolvedYoutubeEmbedUrl) {
      const videoSource =
        previewYoutubeUrl ||
        `${resolvedYoutubeEmbedUrl}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1`;
      const videoThumbnail = videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : null;
      items.push({
        type: "video",
        source: videoSource,
        thumbnail: videoThumbnail,
      });
    }

    if (Array.isArray(product.images)) {
      product.images.forEach((image) => {
        if (image) {
          const optimizedImage =
            optimizeCloudinaryUrl(image, {
              width: 800,
              quality: "auto:good",
            }) || image;
          const thumbnailImage =
            optimizeCloudinaryUrl(image, { width: 150, quality: "auto:eco" }) ||
            image;
          items.push({
            type: "image",
            source: optimizedImage,
            thumbnail: thumbnailImage,
          });
        }
      });
    }

    return items;
  }, [product.images, previewYoutubeUrl, resolvedYoutubeEmbedUrl, videoId]);

  const imageMediaIndexes = useMemo(() => {
    return mediaItems.reduce<number[]>((acc, item, index) => {
      if (item.type === "image") {
        acc.push(index);
      }
      return acc;
    }, []);
  }, [mediaItems]);

  const firstImageMediaIndex = useMemo(() => {
    return imageMediaIndexes.length > 0 ? imageMediaIndexes[0] : -1;
  }, [imageMediaIndexes]);

  const currentMediaItem = mediaItems[currentImageIndex] ?? null;

  useEffect(() => {
    if (mediaItems.length === 0) {
      if (currentImageIndex !== 0) {
        setCurrentImageIndex(0);
      }
      return;
    }

    if (currentImageIndex > mediaItems.length - 1) {
      setCurrentImageIndex(0);
    }
  }, [mediaItems.length, currentImageIndex]);

  const displayedMaterials = useMemo(() => {
    const geMaterials = Array.isArray(product.materials)
      ? product.materials.filter((material) => material && material.trim())
      : [];
    const enMaterials = Array.isArray(product.materialsEn)
      ? product.materialsEn.filter((material) => material && material.trim())
      : [];

    if (language === "en" && enMaterials.length > 0) {
      return enMaterials;
    }

    return geMaterials;
  }, [language, product]);

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

  const mainCategoryRawName = getRawName(product.mainCategory).toLowerCase();
  const mainCategoryLocalizedName = getLocalizedName(
    product.mainCategory
  ).toLowerCase();
  const categoryStructureMain = (
    product.categoryStructure?.main || ""
  ).toString();

  const isPaintingCategory =
    categoryStructureMain.toUpperCase() === MainCategory.PAINTINGS ||
    mainCategoryRawName === "paintings" ||
    mainCategoryRawName === "painting" ||
    mainCategoryLocalizedName === "paintings" ||
    mainCategoryLocalizedName === "painting" ||
    rawCategoryTokens.includes("painting") ||
    rawCategoryTokens.includes("paintings") ||
    rawCategoryTokens.includes("ნახატ");

  const canShowRoomViewer = isPaintingCategory && imageMediaIndexes.length > 0;

  useEffect(() => {
    if (!canShowRoomViewer && isRoomViewerOpen) {
      setIsRoomViewerOpen(false);
    }
  }, [canShowRoomViewer, isRoomViewerOpen]);

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
        await fetchWithAuth(`/products/${product._id}/view`, {
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
      // Try to find variant by selected attributes
      const variant = product.variants.find(
        (v) =>
          (!v.size || v.size === selectedSize) &&
          (!v.color || v.color === selectedColor) &&
          (!v.ageGroup || v.ageGroup === selectedAgeGroup)
      );

      if (variant) {
        stock = variant.stock;
      } else {
        // If no matching variant found, check if variants have no attributes (just stock)
        // In this case, use the first variant's stock or sum of all variant stocks
        const hasNoAttributes = product.variants.every(
          (v) => !v.size && !v.color && !v.ageGroup
        );
        if (hasNoAttributes) {
          // Sum all variant stocks for products without attributes
          stock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        } else {
          stock = 0;
        }
      }
    }

    return stock;
  }, [selectedSize, selectedColor, selectedAgeGroup, product]);

  const isOutOfStock = availableQuantity === 0;

  // Handle Buy Now - Add to cart and redirect to checkout
  const handleBuyNow = async () => {
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

      if (!isInCart) {
        // Track quick purchase action
        trackAddToCart(product._id, displayName, finalPrice, quantity);

        // Add item to cart with discounted price if applicable
        await addToCart(
          product._id,
          quantity,
          selectedSize || undefined,
          selectedColor || undefined,
          selectedAgeGroup || undefined,
          finalPrice
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

  // Function to open fullscreen image
  const openFullscreen = () => {
    if (currentMediaItem?.type !== "image") {
      return;
    }
    setIsFullscreenOpen(true);
  };

  // Function to close fullscreen image
  const closeFullscreen = () => {
    setIsFullscreenOpen(false);
  };

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (mediaItems.length <= 1) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentImageIndex((prevIndex) =>
          prevIndex === 0 ? mediaItems.length - 1 : prevIndex - 1
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentImageIndex((prevIndex) =>
          prevIndex === mediaItems.length - 1 ? 0 : prevIndex + 1
        );
      } else if (e.key === "Escape" && isFullscreenOpen) {
        closeFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [closeFullscreen, isFullscreenOpen, mediaItems.length]);

  if (!product) return null;

  // Safety check for images array
  if (mediaItems.length === 0) {
    return (
      <div className="container">
        <div className="error-message">
          <p>{t("product.noImagesAvailable") || "სურათები მიუწვდომელია"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`container product-details-container ${themeClass}`}>
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
                className={`image-wrapper ${
                  currentMediaItem?.type === "video" ? "is-video" : ""
                }`}
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

                {currentMediaItem?.type === "video" ? (
                  <div className="product-video-frame">
                    <iframe
                      src={currentMediaItem.source}
                      title="Product video"
                      frameBorder={0}
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                      tabIndex={-1}
                    />
                  </div>
                ) : currentMediaItem?.type === "image" ? (
                  <Image
                    src={currentMediaItem.source}
                    alt={displayName}
                    fill
                    className="object-contain"
                    loading="eager"
                  />
                ) : null}

                {currentMediaItem?.type === "image" && (
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
                    {language === "en"
                      ? "Click to zoom"
                      : "დააჭირე გასადიდებლად"}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="thumbnail-container">
            {mediaItems.map((item, index) => {
              const isActive = index === currentImageIndex;
              const isVideo = item.type === "video";

              return (
                <motion.button
                  key={`${item.type}-${index}`}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`thumbnail ${isActive ? "active" : ""} ${
                    isVideo ? "video" : ""
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={
                        isVideo
                          ? "Video preview"
                          : `${displayName} view ${index + 1}`
                      }
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="thumbnail-video-fallback">
                      <Play size={32} />
                    </div>
                  )}
                  {isVideo && (
                    <div className="thumbnail-video-indicator">
                      <Play size={14} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Action buttons row - Share + Try in Room + Views */}
          <div className="image-action-buttons">
            {/* Share Button */}
            <ShareButton
              url={`/products/${product._id}`}
              title={displayName}
              description={`${displayName} by ${product.brand}`}
            />

            {/* Try on Wall Button */}
            {canShowRoomViewer && product.images?.length ? (
              <motion.button
                className="try-on-wall-btn"
                onClick={() => setIsRoomViewerOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t("product.tryInRoom")}
              </motion.button>
            ) : null}

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
          </div>
        </div>

        {/* Right Column - Product Info */}
        <div className="main-product-info">
          {/* Product Title - First for hierarchy */}
          <h1 className="product-title">{displayName}</h1>

          {/* Price and Badge Row */}
          <div className="price-badge-row">
            {/* Price Section */}
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

            {/* Original/Copy Badge */}
            <div className="original-copy-badge">
              <span
                className={`badge-text ${
                  product.isOriginal ? "original" : "copy"
                }`}
              >
                {product.isOriginal
                  ? language === "en"
                    ? "Original"
                    : "ორიგინალი"
                  : language === "en"
                  ? "Copy"
                  : "ასლი"}
              </span>
            </div>
          </div>

          {/* Brand with hover tooltip - Under price */}
          <Link
            href={
              product.user?.artistSlug
                ? `/@${product.user.artistSlug}`
                : `/shop?brand=${encodeURIComponent(product.brand)}`
            }
            className="brand-details"
            title={
              language === "en"
                ? product.user?.artistSlug
                  ? `Visit ${product.brand}'s portfolio`
                  : `View all products by ${product.brand}`
                : product.user?.artistSlug
                ? `${product.brand}-ის პორტფოლიო`
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

            {/* Artist Rating - always show if user exists */}
            {product.user && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  marginLeft: "8px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor:
                    (product.user.artistDirectRating ?? 0) > 0
                      ? "rgba(251, 191, 36, 0.1)"
                      : "rgba(156, 163, 175, 0.1)",
                }}
              >
                <StarIcon
                  size={13}
                  fill={
                    (product.user.artistDirectRating ?? 0) > 0
                      ? "#fbbf24"
                      : "none"
                  }
                  stroke={
                    (product.user.artistDirectRating ?? 0) > 0
                      ? "#fbbf24"
                      : "#9ca3af"
                  }
                  strokeWidth={2}
                />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color:
                      (product.user.artistDirectRating ?? 0) > 0
                        ? "#fbbf24"
                        : "#9ca3af",
                  }}
                >
                  {(product.user.artistDirectRating ?? 0) > 0
                    ? (product.user.artistDirectRating ?? 0).toFixed(1)
                    : "0"}
                  {(product.user.artistDirectReviewsCount ?? 0) > 0 && (
                    <span style={{ fontWeight: 400, marginLeft: "2px" }}>
                      ({product.user.artistDirectReviewsCount})
                    </span>
                  )}
                </span>
              </span>
            )}

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
                  ({product.numReviews}{" "}
                  {language === "en" ? "reviews" : "შეფასება"})
                </div>
              </div>
            </div>
          )}

          {/* Materials and Dimensions Row */}
          <div className="metadata-row">
            {/* Materials Information */}
            {displayedMaterials.length > 0 && (
              <div className="metadata-item">
                <div className="metadata-label">
                  <Package size={18} />
                  <span>{t("product.materials")}</span>
                </div>
                <div className="metadata-value">
                  {displayedMaterials.join(", ")}
                </div>
              </div>
            )}

            {/* Dimensions Information */}
            {dimensions && (
              <div className="metadata-item">
                <div className="metadata-label">
                  <Ruler size={18} />
                  <span>{t("product.dimensions")}</span>
                </div>
                <div className="metadata-value">
                  {dimensions.width && `${dimensions.width} × `}
                  {dimensions.height && `${dimensions.height}`}
                  {dimensions.depth && ` × ${dimensions.depth}`}{" "}
                  {t("product.cm")}
                </div>
              </div>
            )}
          </div>

          {/* Description - Prominent with label */}
          {(product.description || product.descriptionEn) && (
            <div className="description-section">
              <h3 className="section-label">
                {language === "en" ? "Description" : "აღწერა"}
              </h3>
              <div className="description-content">
                <p>
                  {language === "en" && product.descriptionEn
                    ? product.descriptionEn
                    : product.description}
                </p>
              </div>
            </div>
          )}

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
                : availableQuantity === 1
                ? "last-item"
                : availableQuantity <= 5
                ? "low-stock"
                : "in-stock"
            }`}
          >
            <div className="stock-dot"></div>
            {isOutOfStock ? (
              <span>{language === "en" ? "Sold Out" : "გაყიდულია"}</span>
            ) : availableQuantity === 1 ? (
              <span className="hurry-text">
                🔥{" "}
                {language === "en"
                  ? "Hurry! Only 1 unique piece"
                  : "იჩქარე! მხოლოდ 1 უნიკალური ნამუშევარი"}
              </span>
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

              {/* Buy Now Button */}
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
                    <span>
                      {language === "en" ? "Buy Now" : "იყიდე ახლავე"}
                    </span>
                  </>
                )}
              </button>
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

          {/* <div className="tabs">
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
          </div> */}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {isFullscreenOpen && currentMediaItem?.type === "image" && (
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
              src={currentMediaItem.source}
              alt={displayName}
              width={1200}
              height={1200}
              quality={100}
              className="fullscreen-image"
            />

            {/* Gallery Navigation in Fullscreen */}
            {imageMediaIndexes.length > 1 && (
              <>
                <button
                  className="fullscreen-gallery-nav prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentPos =
                      imageMediaIndexes.indexOf(currentImageIndex);
                    const newPos =
                      currentPos === 0
                        ? imageMediaIndexes.length - 1
                        : currentPos - 1;
                    setCurrentImageIndex(imageMediaIndexes[newPos]);
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
                    const currentPos =
                      imageMediaIndexes.indexOf(currentImageIndex);
                    const newPos =
                      currentPos === imageMediaIndexes.length - 1
                        ? 0
                        : currentPos + 1;
                    setCurrentImageIndex(imageMediaIndexes[newPos]);
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
      {canShowRoomViewer && isRoomViewerOpen && (
        <RoomViewer
          productImage={
            currentMediaItem?.type === "image"
              ? currentMediaItem.source
              : mediaItems.find((m) => m.type === "image")?.source || ""
          }
          isOpen={isRoomViewerOpen}
          onClose={() => setIsRoomViewerOpen(false)}
          dimensions={product.dimensions}
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
