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
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Sparkles, TicketPercent } from "lucide-react";
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
  const [ctaVisible, setCtaVisible] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

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
      setCtaVisible(false);
      return;
    }

    const evaluateScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollerEl;
      const overflow = scrollWidth > clientWidth + 1;
      setHasOverflow(overflow);

      if (overflow) {
        // თუ overflow არსებობს, CTA გამოჩნდეს მხოლოდ მაშინ როცა ბოლომდე გავიდეთ
        const reachedEnd = scrollLeft + clientWidth >= scrollWidth - 10;
        setCtaVisible(reachedEnd);
      } else {
        // თუ overflow არ არსებობს, CTA ყოველთვის ჩანდეს
        setCtaVisible(true);
      }
    };

    evaluateScroll();

    scrollerEl.addEventListener("scroll", evaluateScroll, { passive: true });
    window.addEventListener("resize", evaluateScroll);

    return () => {
      scrollerEl.removeEventListener("scroll", evaluateScroll);
      window.removeEventListener("resize", evaluateScroll);
    };
  }, [items.length]);

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
            className={`discounted-rail__cta ${ctaVisible ? "is-visible" : ""}`}
            tabIndex={ctaVisible ? 0 : -1}
            aria-hidden={!ctaVisible}
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
