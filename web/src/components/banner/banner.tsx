"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import { fetchActiveBanners } from "@/lib/banner-api";
import { Banner as BannerType } from "@/types/banner";
import { trackBannerClick } from "@/lib/ga4-analytics";
import { optimizeCloudinaryUrl } from "@/lib/utils";
import "./banner.css";

const Banner = () => {
  const { language } = useLanguage();
  const [banners, setBanners] = useState<BannerType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const activeBanners = await fetchActiveBanners();
        setBanners(activeBanners);
        setIsLoaded(true);
      } catch (error) {
        console.error("Error loading banners:", error);
        setIsLoaded(true);
      }
    };

    loadBanners();
  }, []);

  // Preload all banner images once they're fetched
  useEffect(() => {
    if (!banners.length) return;

    banners.forEach((banner) => {
      if (banner.imageUrl) {
        const img = new Image();
        img.src =
          optimizeCloudinaryUrl(banner.imageUrl, {
            width: 1920,
            quality: "auto:eco",
          }) || banner.imageUrl;
      }
    });
  }, [banners]);

  const changeBanner = useCallback(
    (newIndex: number) => {
      if (newIndex === currentIndex || newIndex >= banners.length || newIndex < 0) return;

      setCurrentIndex(newIndex);
      
      // Scroll to the new slide
      if (scrollContainerRef.current) {
        isScrollingRef.current = true;
        const slideWidth = scrollContainerRef.current.offsetWidth;
        scrollContainerRef.current.scrollTo({
          left: newIndex * slideWidth,
          behavior: "smooth",
        });
        // Reset scrolling flag after animation
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 500);
      }
    },
    [currentIndex, banners.length]
  );

  // Handle scroll snap - detect which slide is visible
  const handleScroll = useCallback(() => {
    if (isScrollingRef.current || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const slideWidth = container.offsetWidth;
    const scrollPosition = container.scrollLeft;
    const newIndex = Math.round(scrollPosition / slideWidth);

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < banners.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, banners.length]);

  // Auto-advance banners
  useEffect(() => {
    if (banners.length <= 1 || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      changeBanner((currentIndex + 1) % banners.length);
    }, 8000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [banners.length, isPaused, currentIndex, changeBanner]);

  const nextBanner = useCallback(() => {
    changeBanner((currentIndex + 1) % banners.length);
  }, [changeBanner, currentIndex, banners.length]);

  const prevBanner = useCallback(() => {
    changeBanner((currentIndex - 1 + banners.length) % banners.length);
  }, [changeBanner, currentIndex, banners.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (banners.length <= 1) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          prevBanner();
          break;
        case "ArrowRight":
          event.preventDefault();
          nextBanner();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextBanner, prevBanner, banners.length]);

  // Attach scroll listener for snap detection
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || banners.length <= 1) return;

    let scrollTimeout: NodeJS.Timeout;
    const onScroll = () => {
      // Debounce scroll handler
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 50);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimeout);
    };
  }, [handleScroll, banners.length]);

  if (!isLoaded || banners.length === 0) {
    return null; // Don't render anything if no banners
  }

  return (
    <div
      className="banner-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="banner-container" ref={scrollContainerRef}>
        {banners.map((banner, index) => (
          <div
            key={banner._id || index}
            className="banner-slide"
            style={{
              backgroundImage: `url(${optimizeCloudinaryUrl(banner.imageUrl, {
                width: 1920,
                quality: "auto:eco",
              })})`,
            }}
          >
            <div className="banner-overlay"></div>
            <div className="banner-content">
              <h2 className="banner-title">
                {language === "en" ? banner.titleEn : banner.title}
              </h2>
              {banner.buttonText && banner.buttonLink && (
                <Link
                  href={banner.buttonLink}
                  className="banner-cta-btn"
                  onClick={() =>
                    trackBannerClick(
                      banner._id || `banner-${index}`,
                      language === "en" ? banner.titleEn : banner.title,
                      banner.buttonLink
                    )
                  }
                >
                  <span className="btn-text">
                    {language === "en"
                      ? banner.buttonTextEn
                      : banner.buttonText}
                  </span>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Carousel navigation (only show if multiple banners) */}
      {banners.length > 1 && (
        <>
          <button
            className="carousel-btn prev-btn"
            onClick={prevBanner}
            aria-label="Previous banner"
          >
            &#8249;
          </button>
          <button
            className="carousel-btn next-btn"
            onClick={nextBanner}
            aria-label="Next banner"
          >
            &#8250;
          </button>

          <div className="carousel-indicators">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`indicator ${
                  index === currentIndex ? "active" : ""
                }`}
                onClick={() => changeBanner(index)}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Banner;
