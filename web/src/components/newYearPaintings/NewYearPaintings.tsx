"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@/types";
import { getProducts } from "@/modules/products/api/get-products";
import { memoryCache } from "@/lib/cache";
import { useLanguage } from "@/hooks/LanguageContext";
import { ProductCard } from "@/modules/products/components/product-card";
import { ArrowRight, ChevronLeft, ChevronRight, Snowflake } from "lucide-react";
import "./newYearPaintings.css";

const RAIL_LIMIT = 12;
const CACHE_TTL_SECONDS = 5 * 60;
const CACHE_STALE_TIME_MS = CACHE_TTL_SECONDS * 1000;

// Hardcoded category IDs for Winter paintings
const MAIN_CATEGORY_ID = "68768f6f0b55154655a8e882";
const SUB_CATEGORY_ID = "693561ba2a2cfb77791cf514";

const NewYearPaintings = () => {
  const { t } = useLanguage();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fetch paintings from the specific subcategory (Winter collection)
  const { data: paintingProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["home", "winter-paintings"],
    queryFn: async () => {
      const cacheKey = `home-winter-paintings`;
      const cached = memoryCache.get<Product[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const { items = [] } = await getProducts(1, RAIL_LIMIT * 2, {
        sortBy: "createdAt",
        sortDirection: "desc",
        mainCategory: MAIN_CATEGORY_ID,
        subCategory: SUB_CATEGORY_ID,
        excludeOutOfStock: "true",
        includeVariants: "true",
      });

      const filtered = items
        .filter(
          (p) =>
            (p.countInStock ?? 0) > 0 ||
            (p.variants && p.variants.some((v) => (v.stock ?? 0) > 0)),
        )
        .slice(0, RAIL_LIMIT);
      memoryCache.set(cacheKey, filtered, CACHE_TTL_SECONDS);
      return filtered;
    },
    staleTime: CACHE_STALE_TIME_MS,
  });

  const items = useMemo(() => {
    return paintingProducts
      .filter(
        (p) =>
          (p.countInStock ?? 0) > 0 ||
          (p.variants && p.variants.some((v) => (v.stock ?? 0) > 0)),
      )
      .slice(0, RAIL_LIMIT);
  }, [paintingProducts]);

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
        scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 10,
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

  const scrollBy = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cardWidth = 280;
    const scrollAmount = cardWidth * 2;
    scroller.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <section className="new-year-paintings-section">
        <div className="new-year-paintings-wrapper">
          <div className="new-year-paintings-loader">
            <div className="loading-spinner" />
          </div>
        </div>
      </section>
    );
  }

  if (!hasItems) {
    return null;
  }

  return (
    <section className="new-year-paintings-section">
      <div className="new-year-paintings-wrapper">
        <div className="new-year-paintings-header">
          <div className="new-year-paintings-headline">
            <span className="new-year-paintings-eyebrow">
              <Snowflake size={14} />
              {t("home.newYearPaintings.eyebrow")}
            </span>
            <h2 className="new-year-paintings-title">
              {t("home.newYearPaintings.title")}
            </h2>
            <p className="new-year-paintings-subtitle">
              {t("home.newYearPaintings.subtitle")}
            </p>
          </div>
          <Link
            href={`/shop?mainCategory=${MAIN_CATEGORY_ID}&subCategory=${SUB_CATEGORY_ID}`}
            className="new-year-paintings-cta"
          >
            {t("home.newYearPaintings.viewAll")}
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="new-year-paintings-scroller-shell">
          {hasOverflow && canScrollLeft && (
            <button
              className="new-year-paintings-scroll-btn new-year-paintings-scroll-btn--left"
              onClick={() => scrollBy("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div ref={scrollerRef} className="new-year-paintings-scroller">
            {items.map((product) => (
              <div key={product._id} className="new-year-paintings-card">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {hasOverflow && canScrollRight && (
            <button
              className="new-year-paintings-scroll-btn new-year-paintings-scroll-btn--right"
              onClick={() => scrollBy("right")}
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Decorative snowflakes */}
      <div className="snowflake-decoration snowflake-1">❄</div>
      <div className="snowflake-decoration snowflake-2">❅</div>
      <div className="snowflake-decoration snowflake-3">❆</div>
      <div className="snowflake-decoration snowflake-4">✦</div>
      <div className="snowflake-decoration snowflake-5">❄</div>
      <div className="snowflake-decoration snowflake-6">❅</div>
    </section>
  );
};

export default NewYearPaintings;
