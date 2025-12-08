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
  Palette,
  Sparkles,
} from "lucide-react";
import "./premiumRail.css";

const PREMIUM_RAIL_LIMIT = 12;
const PREMIUM_PRICE_THRESHOLD = 1500; // Products above 1500 GEL
const PAINTINGS_CATEGORY_ID = "68768f6f0b55154655a8e882"; // Only paintings
const CACHE_TTL_SECONDS = 5 * 60;
const CACHE_STALE_TIME_MS = CACHE_TTL_SECONDS * 1000;

const PremiumRail = () => {
  const { t, language } = useLanguage();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { data: premiumProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["home", "premium-rail", language],
    queryFn: async () => {
      const cacheKey = `home-premium-rail-${language}`;
      const cached = memoryCache.get<Product[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch paintings sorted by price descending
      const { items = [] } = await getProducts(1, PREMIUM_RAIL_LIMIT * 3, {
        sortBy: "price",
        sortDirection: "desc",
        minPrice: PREMIUM_PRICE_THRESHOLD.toString(),
        mainCategory: PAINTINGS_CATEGORY_ID,
      });

      const filtered = items
        .filter((p) => p.price >= PREMIUM_PRICE_THRESHOLD)
        .slice(0, PREMIUM_RAIL_LIMIT);

      memoryCache.set(cacheKey, filtered, CACHE_TTL_SECONDS);
      return filtered;
    },
    staleTime: CACHE_STALE_TIME_MS,
  });

  const items = useMemo(() => {
    return premiumProducts
      .filter((p) => p.price >= PREMIUM_PRICE_THRESHOLD)
      .slice(0, PREMIUM_RAIL_LIMIT);
  }, [premiumProducts]);

  const hasItems = items.length > 0;

  const highestPrice = useMemo(() => {
    if (!hasItems) {
      return 0;
    }

    return items.reduce((max, product) => {
      return product.price > max ? product.price : max;
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
      scrollerEl.querySelector(".premium-rail__card")?.clientWidth || 250;
    const scrollAmount = cardWidth * 2;

    scrollerEl.scrollBy({
      left: -scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    const scrollerEl = scrollerRef.current;
    if (!scrollerEl) return;

    const cardWidth =
      scrollerEl.querySelector(".premium-rail__card")?.clientWidth || 250;
    const scrollAmount = cardWidth * 2;

    scrollerEl.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  // If no premium products, don't render anything
  if (!isLoading && !hasItems) {
    return null;
  }

  return (
    <section className="premium-rail">
      <div className="premium-rail__wrapper">
        <div className="premium-rail__header">
          <div className="premium-rail__headline">
            <span className="premium-rail__eyebrow" aria-live="polite">
              <Palette size={14} aria-hidden="true" />
              {language === "en"
                ? "Exclusive Collection"
                : "ექსკლუზიური კოლექცია"}
            </span>
            <h2 className="premium-rail__title">
              {language === "en"
                ? "Premium Paintings"
                : "პრემიუმ ნახატები პროფესიონალი მხატვრებისგან"}
            </h2>

            {/* {highestPrice > 0 && (
              <span className="premium-rail__badge">
                <Sparkles size={14} aria-hidden="true" />
                {language === "en"
                  ? `From ${PREMIUM_PRICE_THRESHOLD}₾`
                  : `${PREMIUM_PRICE_THRESHOLD}₾-დან`}
              </span>
            )} */}

            <p className="premium-rail__subtitle">
              {language === "en"
                ? "Discover exceptional paintings from talented artists — direct from the creators."
                : "შეიძინე პროფესიონალი მხატვრების ორიგინალი და პრემიუმ ხარისხის საკოლექციო ნახატები — პირდაპირ ავტორებისგან."}
            </p>
          </div>

          <Link
            href={`/shop?minPrice=${PREMIUM_PRICE_THRESHOLD}&mainCategory=${PAINTINGS_CATEGORY_ID}&sortBy=price&sortDirection=desc`}
            className="premium-rail__cta is-visible"
          >
            <span>{language === "en" ? "View All" : "ყველას ნახვა"}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <div className="premium-rail__loader">
            <LoadingAnim />
          </div>
        ) : hasItems ? (
          <div
            className={`premium-rail__scroller-shell ${
              hasOverflow ? "has-overflow" : ""
            }`}
          >
            {/* Left Arrow */}
            {canScrollLeft && (
              <button
                className="premium-rail__scroll-btn premium-rail__scroll-btn--left"
                onClick={scrollLeft}
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* Right Arrow */}
            {canScrollRight && (
              <button
                className="premium-rail__scroll-btn premium-rail__scroll-btn--right"
                onClick={scrollRight}
                aria-label="Scroll right"
              >
                <ChevronRight size={20} />
              </button>
            )}

            <div
              ref={scrollerRef}
              className="premium-rail__scroller"
              role="list"
              aria-label={
                language === "en" ? "Premium artworks" : "პრემიუმ ნამუშევრები"
              }
            >
              <div className="premium-rail__grid">
                {items.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default PremiumRail;
