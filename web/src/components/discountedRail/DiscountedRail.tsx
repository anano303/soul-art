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
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TicketPercent,
} from "lucide-react";
import { trackSeeMoreDiscountsClick } from "@/lib/ga4-analytics";
import "./discountedRail.css";

const DISCOUNT_RAIL_LIMIT = 12;
const CACHE_TTL_SECONDS = 5 * 60;
const CACHE_STALE_TIME_MS = CACHE_TTL_SECONDS * 1000;

function hasActiveDiscount(product: Product) {
  if (!product.discountPercentage || product.discountPercentage <= 0) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = product.discountStartDate
    ? new Date(product.discountStartDate)
    : null;
  const endDate = product.discountEndDate
    ? new Date(product.discountEndDate)
    : null;

  if (startDate) {
    startDate.setHours(0, 0, 0, 0);
    if (today < startDate) {
      return false;
    }
  }

  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
    if (today > endDate) {
      return false;
    }
  }

  return true;
}

const DiscountedRail = () => {
  const { t, language } = useLanguage();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { data: discountedProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["home", "discounted-rail", language],
    queryFn: async () => {
      const cacheKey = `home-discounted-rail-${language}`;
      const cached = memoryCache.get<Product[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const { items = [] } = await getProducts(1, DISCOUNT_RAIL_LIMIT * 2, {
        discounted: "true",
        sortBy: "discountPercentage",
        sortDirection: "desc",
      });

      const filtered = items
        .filter(hasActiveDiscount)
        .slice(0, DISCOUNT_RAIL_LIMIT);

      memoryCache.set(cacheKey, filtered, CACHE_TTL_SECONDS);
      return filtered;
    },
    staleTime: CACHE_STALE_TIME_MS,
  });

  const items = useMemo(() => {
    return discountedProducts
      .filter(hasActiveDiscount)
      .slice(0, DISCOUNT_RAIL_LIMIT);
  }, [discountedProducts]);

  const hasItems = items.length > 0;

  const topDiscount = useMemo(() => {
    if (!hasItems) {
      return 0;
    }

    return items.reduce((max, product) => {
      const discount = product.discountPercentage ?? 0;
      return discount > max ? discount : max;
    }, 0);
  }, [hasItems, items]);

  useEffect(() => {
    const scrollerEl = scrollerRef.current;
    if (!scrollerEl) {
      setHasOverflow(false);
      return;
    }

    const evaluateScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollerEl;
      const overflow = scrollWidth > clientWidth + 1;
      setHasOverflow(overflow);

      // Scroll arrows visibility
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    };

    evaluateScroll();

    scrollerEl.addEventListener("scroll", evaluateScroll, { passive: true });
    window.addEventListener("resize", evaluateScroll);

    return () => {
      scrollerEl.removeEventListener("scroll", evaluateScroll);
      window.removeEventListener("resize", evaluateScroll);
    };
  }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const scrollerEl = scrollerRef.current;
      if (!scrollerEl || !hasOverflow) return;

      if (event.key === "ArrowLeft" && canScrollLeft) {
        event.preventDefault();
        scrollLeft();
      } else if (event.key === "ArrowRight" && canScrollRight) {
        event.preventDefault();
        scrollRight();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canScrollLeft, canScrollRight, hasOverflow]);

  const scrollLeft = () => {
    const scrollerEl = scrollerRef.current;
    if (!scrollerEl) return;

    const cardWidth =
      scrollerEl.querySelector(".discounted-rail__card")?.clientWidth || 250;
    const scrollAmount = cardWidth * 2; // Scroll 2 cards at a time

    scrollerEl.scrollBy({
      left: -scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    const scrollerEl = scrollerRef.current;
    if (!scrollerEl) return;

    const cardWidth =
      scrollerEl.querySelector(".discounted-rail__card")?.clientWidth || 250;
    const scrollAmount = cardWidth * 2; // Scroll 2 cards at a time

    scrollerEl.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="discounted-rail">
      <div className="discounted-rail__wrapper">
        <div className="discounted-rail__header">
          <div className="discounted-rail__headline">
            <span className="discounted-rail__eyebrow" aria-live="polite">
              <Sparkles size={14} aria-hidden="true" />
              {t("home.discountedRail.eyebrow")}
            </span>
            <h2 className="discounted-rail__title">
              {t("home.discountedRail.title")}
            </h2>

            {(topDiscount ?? 0) > 0 && (
              <span className="discounted-rail__badge">
                <TicketPercent size={14} aria-hidden="true" />
                {t("home.discountedRail.badge", {
                  discount: Math.round(topDiscount),
                })}
              </span>
            )}

            <p className="discounted-rail__subtitle">
              {t("home.discountedRail.subtitle")}
            </p>
          </div>

          <Link
            href="/shop?discountOnly=true"
            className="discounted-rail__cta is-visible"
            onClick={() => trackSeeMoreDiscountsClick()}
          >
            <span>{t("home.discountedRail.viewAll")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <div className="discounted-rail__loader">
            <LoadingAnim />
          </div>
        ) : hasItems ? (
          <div
            className={`discounted-rail__scroller-shell ${
              hasOverflow ? "has-overflow" : ""
            }`}
          >
            {/* Left Arrow */}
            {canScrollLeft && (
              <button
                className="discounted-rail__scroll-btn discounted-rail__scroll-btn--left"
                onClick={scrollLeft}
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* Right Arrow */}
            {canScrollRight && (
              <button
                className="discounted-rail__scroll-btn discounted-rail__scroll-btn--right"
                onClick={scrollRight}
                aria-label="Scroll right"
              >
                <ChevronRight size={20} />
              </button>
            )}

            <div
              ref={scrollerRef}
              className="discounted-rail__scroller"
              role="list"
              aria-label={t("home.discountedRail.ariaLabel")}
            >
              {items.map((product) => (
                <div
                  key={product._id}
                  className="discounted-rail__card"
                  role="listitem"
                >
                  <ProductCard
                    product={product}
                    className="discounted-rail__product-card"
                  />
                </div>
              ))}
              {/* See More Card at the end */}
              <div className="discounted-rail__card" role="listitem">
                <Link
                  href="/shop?discountOnly=true"
                  className="discounted-rail__see-more-card"
                  onClick={() => trackSeeMoreDiscountsClick()}
                >
                  <div className="discounted-rail__see-more-content">
                    <Sparkles
                      size={32}
                      className="discounted-rail__see-more-icon"
                    />
                    <h3 className="discounted-rail__see-more-title">
                      {t("home.discountedRail.viewAll")}
                    </h3>
                    <p className="discounted-rail__see-more-subtitle">
                      {language === "en"
                        ? "Explore all discounts"
                        : "ნახე ყველა ფასდაკლება"}
                    </p>
                    <div className="discounted-rail__see-more-arrow">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <p className="discounted-rail__empty">
            {t("home.discountedRail.empty")}
          </p>
        )}
      </div>
    </section>
  );
};

export default DiscountedRail;
