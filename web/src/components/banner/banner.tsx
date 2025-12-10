"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import { fetchActiveBanners } from "@/lib/banner-api";
import { Banner as BannerType } from "@/types/banner";
import { trackBannerClick } from "@/lib/ga4-analytics";
import { optimizeCloudinaryUrl } from "@/lib/utils";
import { AdUnit } from "@/components/GoogleAdSense";
import "./banner.css";

const Banner = () => {
  const { language } = useLanguage();
  const [banners, setBanners] = useState<BannerType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create slides array: interleave banners with ads
  // [banner1, ad, banner2, ad, banner3, ad, ...]
  const slides = useMemo(
    () =>
      banners.flatMap((banner, index) => [
        { type: "banner" as const, data: banner, key: banner._id || `banner-${index}` },
        { type: "ad" as const, data: null, key: `ad-${index}` },
      ]),
    [banners]
  );

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
      if (newIndex === currentIndex || newIndex >= slides.length) return;

      // Store current index as previous before changing
      setPreviousIndex(currentIndex);
      setCurrentIndex(newIndex);
    },
    [currentIndex, slides.length]
  );

  // Auto-advance banners
  useEffect(() => {
    if (slides.length <= 1 || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      changeBanner((currentIndex + 1) % slides.length);
    }, 8000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [slides.length, isPaused, currentIndex, changeBanner]);

  const nextBanner = useCallback(() => {
    changeBanner((currentIndex + 1) % slides.length);
  }, [changeBanner, currentIndex, slides.length]);

  const prevBanner = useCallback(() => {
    changeBanner((currentIndex - 1 + slides.length) % slides.length);
  }, [changeBanner, currentIndex, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (slides.length <= 1) return;

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
  }, [nextBanner, prevBanner, slides.length]);

  // Add touch swipe functionality for mobile
  useEffect(() => {
    if (!slides.length || slides.length <= 1) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as unknown as TouchEvent;
      touchStartX = touchEvent.touches[0].clientX;
    };

    const handleTouchEnd = (e: Event) => {
      const touchEvent = e as unknown as TouchEvent;
      touchEndX = touchEvent.changedTouches[0].clientX;
      handleSwipe();
    };

    const handleSwipe = () => {
      // Determine swipe direction and minimum swipe distance (30px)
      if (touchEndX < touchStartX - 30) {
        // Swipe left - go to next banner
        nextBanner();
      } else if (touchEndX > touchStartX + 30) {
        // Swipe right - go to previous banner
        prevBanner();
      }
    };

    const bannerContainer = document.querySelector(".banner-container");
    if (bannerContainer) {
      bannerContainer.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      bannerContainer.addEventListener("touchend", handleTouchEnd, {
        passive: true,
      });

      return () => {
        bannerContainer.removeEventListener("touchstart", handleTouchStart);
        bannerContainer.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [slides.length, nextBanner, prevBanner]);

  if (!isLoaded || banners.length === 0) {
    return null; // Don't render anything if no banners
  }

  return (
    <div
      className="banner-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        const isPrevious = index === previousIndex;

        if (!isActive && !isPrevious) return null;

        // Render Ad slide
        if (slide.type === "ad") {
          return (
            <div
              key={slide.key}
              className={`banner-slide banner-ad-slide ${isActive ? "active" : ""} ${
                isPrevious ? "previous" : ""
              }`}
            >
              <div className="banner-overlay banner-ad-overlay"></div>
              <div className="banner-ad-content">
                <AdUnit
                  slot="4167693292"
                  format="auto"
                  fullWidthResponsive={true}
                  className="banner-ad-unit"
                />
              </div>
            </div>
          );
        }

        // Render Banner slide
        const banner = slide.data;
        return (
          <div
            key={slide.key}
            className={`banner-slide ${isActive ? "active" : ""} ${
              isPrevious ? "previous" : ""
            }`}
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
        );
      })}

      {/* Carousel navigation (only show if multiple slides) */}
      {slides.length > 1 && (
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
            {slides.map((_, index) => (
              <button
                key={index}
                className={`indicator ${
                  index === currentIndex ? "active" : ""
                }`}
                onClick={() => changeBanner(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Banner;
