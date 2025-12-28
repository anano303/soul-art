"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@/types";
import { getProducts } from "@/modules/products/api/get-products";
import { memoryCache } from "@/lib/cache";
import { useLanguage } from "@/hooks/LanguageContext";
import LoadingAnim from "@/components/loadingAnim/loadingAnim";
import { ProductCard } from "@/modules/products/components/product-card";
import { ArrowRight, ChevronLeft, ChevronRight, Gift } from "lucide-react";
import "./giftCategories.css";

const GIFT_RAIL_LIMIT = 12;
const CACHE_TTL_SECONDS = 5 * 60;
const CACHE_STALE_TIME_MS = CACHE_TTL_SECONDS * 1000;

const GiftCategories = () => {
  const { t, language } = useLanguage();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fetch products under 200 GEL
  const { data: giftProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["home", "gift-rail", language],
    queryFn: async () => {
      const cacheKey = `home-gift-rail-${language}`;
      const cached = memoryCache.get<Product[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const { items = [] } = await getProducts(1, GIFT_RAIL_LIMIT * 2, {
        sortBy: "rating",
        sortDirection: "desc",
        excludeOutOfStock: "true",
        includeVariants: "true",
      });

      // Filter products under 200 GEL (considering discounts)
      const filtered = items
        .filter((product) => {
          const price = product.price;
          const discountedPrice = product.discountPercentage
            ? price * (1 - product.discountPercentage / 100)
            : price;
          return discountedPrice <= 200;
        })
        .slice(0, GIFT_RAIL_LIMIT);

      memoryCache.set(cacheKey, filtered, CACHE_TTL_SECONDS);
      return filtered;
    },
    staleTime: CACHE_STALE_TIME_MS,
  });

  const items = useMemo(() => {
    return giftProducts
      .filter((product) => {
        const price = product.price;
        const discountedPrice = product.discountPercentage
          ? price * (1 - product.discountPercentage / 100)
          : price;
        return discountedPrice <= 200;
      })
      .slice(0, GIFT_RAIL_LIMIT);
  }, [giftProducts]);

  const hasItems = items.length > 0;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const checkOverflow = () => {
      const scrollable = scroller.scrollWidth > scroller.clientWidth;
      setHasOverflow(scrollable);
      updateScrollButtons();
    };

    const updateScrollButtons = () => {
      setCanScrollLeft(scroller.scrollLeft > 10);
      setCanScrollRight(
        scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 10
      );
    };

    checkOverflow();
    scroller.addEventListener("scroll", updateScrollButtons, {
      passive: true,
    });

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollButtons);
      observer.disconnect();
    };
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cardWidth = 280;
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * 2;

    scroller.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <section className="gift-categories-section">
        <div className="gift-categories-container">
          <LoadingAnim />
        </div>
      </section>
    );
  }

  if (!hasItems) {
    return null;
  }

  return (
    <section
      className="gift-categories-section"
      aria-label={t("home.giftCategories.ariaLabel")}
    >
      <div className="gift-categories-container">
        {/* Header */}
        <div className="gift-categories-header">
          <div className="gift-categories-header-content">
            <div className="gift-categories-eyebrow">
              <Gift className="gift-categories-icon" size={20} />
              <span>{t("home.giftCategories.eyebrow")}</span>
            </div>
            <h2 className="gift-categories-title">
              {t("home.giftCategories.title")}
            </h2>
            <p className="gift-categories-subtitle">
              {t("home.giftCategories.subtitle")}
            </p>
          </div>
          <Link
            href="/shop?maxPrice=200&sort=-rating"
            className="gift-categories-view-all"
            aria-label={t("home.giftCategories.viewAll")}
          >
            <span>{t("home.giftCategories.viewAll")}</span>
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Products Rail */}
        <div className="gift-categories-rail-wrapper">
          {hasOverflow && canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="gift-categories-scroll-btn gift-categories-scroll-btn-left"
              aria-label="Scroll left"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div className="gift-categories-rail" ref={scrollerRef}>
            <div className="gift-categories-grid">
              {items.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>

          {hasOverflow && canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="gift-categories-scroll-btn gift-categories-scroll-btn-right"
              aria-label="Scroll right"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default GiftCategories;
