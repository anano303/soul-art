"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@/types";
import { getProducts } from "@/modules/products/api/get-products";
import { memoryCache } from "@/lib/cache";
import { useLanguage } from "@/hooks/LanguageContext";
import { ProductCard } from "@/modules/products/components/product-card";
import { ArrowRight, ChevronLeft, ChevronRight, Flower2 } from "lucide-react";
import "./SpringCollection.css";

const RAIL_LIMIT = 12;
const CACHE_TTL_SECONDS = 5 * 60;
const CACHE_STALE_TIME_MS = CACHE_TTL_SECONDS * 1000;

/** Keywords to match spring/flower products across GE and EN */
const SPRING_KEYWORDS = [
  "ყვავილ",
  "გაზაფხულ",
  "ბაღ",
  "ბუნებ",
  "მზესუმზირ",
  "მზესუმზირა",
  "იასამან",
  "იასამნ",
  "ყაყაჩო",
  "ვარდ",
  "იის",
  "ტიტა",
  "ნარგიზ",
  "ტულიპ",
  "პეონ",
  "ქრიზანთემ",
  "spring",
  "flower",
  "blossom",
  "garden",
  "bloom",
  "sunflower",
  "poppy",
  "rose",
  "lilac",
  "tulip",
  "daisy",
  "peony",
];

const SpringCollection = () => {
  const { t } = useLanguage();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fetch products matching spring/flower keywords using single regex OR query
  const { data: springProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["home", "spring-collection"],
    queryFn: async () => {
      const cacheKey = "home-spring-collection";
      const cached = memoryCache.get<Product[]>(cacheKey);
      if (cached) return cached;

      // Single API call with regex OR for all keywords
      const regexKeyword = SPRING_KEYWORDS.join("|");
      const { items = [] } = await getProducts(1, RAIL_LIMIT * 2, {
        keyword: regexKeyword,
        sortBy: "createdAt",
        sortDirection: "desc",
        excludeOutOfStock: "true",
        includeVariants: "true",
      });

      // Filter in-stock & limit
      const filtered = items
        .filter(
          (p) =>
            (p.countInStock ?? 0) > 0 ||
            (p.variants && p.variants.some((v) => (v.stock ?? 0) > 0))
        )
        .slice(0, RAIL_LIMIT);

      memoryCache.set(cacheKey, filtered, CACHE_TTL_SECONDS);
      return filtered;
    },
    staleTime: CACHE_STALE_TIME_MS,
  });

  const items = useMemo(() => {
    return springProducts
      .filter(
        (p) =>
          (p.countInStock ?? 0) > 0 ||
          (p.variants && p.variants.some((v) => (v.stock ?? 0) > 0))
      )
      .slice(0, RAIL_LIMIT);
  }, [springProducts]);

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
      <section className="spring-section">
        <div className="spring-wrapper">
          <div className="spring-loader">
            <div className="spring-spinner" />
          </div>
        </div>
      </section>
    );
  }

  if (!hasItems) {
    return null;
  }

  return (
    <section className="spring-section">
      {/* Cherry blossom branches at top corners */}
      <div className="spring-branch spring-branch--left" />
      <div className="spring-branch spring-branch--right" />

      {/* Falling blossoms */}
      <div className="spring-blossom spring-blossom-1">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>
      <div className="spring-blossom spring-blossom-2">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>
      <div className="spring-blossom spring-blossom-3">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>
      <div className="spring-blossom spring-blossom-4">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>
      <div className="spring-blossom spring-blossom-5">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>
      <div className="spring-blossom spring-blossom-6">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>
      <div className="spring-blossom spring-blossom-7">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>
      <div className="spring-blossom spring-blossom-8">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>
      <div className="spring-blossom spring-blossom-9">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>
      <div className="spring-blossom spring-blossom-10">
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-petal" />
        <div className="blossom-petal" /><div className="blossom-center" />
      </div>

      <div className="spring-wrapper">
        <div className="spring-header">
          <div className="spring-headline">
            <span className="spring-eyebrow">
              <Flower2 size={14} />
              {t("home.springCollection.eyebrow")}
            </span>
            <h2 className="spring-title">
              {t("home.springCollection.title")}
            </h2>
            <p className="spring-subtitle">
              {t("home.springCollection.subtitle")}
            </p>
          </div>
          <Link
            href="/shop?collection=spring"
            className="spring-cta"
          >
            {t("home.springCollection.viewAll")}
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="spring-scroller-shell">
          {hasOverflow && canScrollLeft && (
            <button
              className="spring-scroll-btn spring-scroll-btn--left"
              onClick={() => scrollBy("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div
            ref={scrollerRef}
            className="spring-scroller"
            aria-label={t("home.springCollection.ariaLabel")}
          >
            {items.map((product) => (
              <div key={product._id} className="spring-card">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {hasOverflow && canScrollRight && (
            <button
              className="spring-scroll-btn spring-scroll-btn--right"
              onClick={() => scrollBy("right")}
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default SpringCollection;
