"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import { fetchActiveBanners } from "@/lib/banner-api";
import { Banner as BannerType } from "@/types/banner";
import "./banner.css";

const Banner = () => {
  const { language } = useLanguage();
  const [banners, setBanners] = useState<BannerType[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [animationClass, setAnimationClass] = useState("");

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

  // Auto-advance banners every 8 seconds (pause on hover)
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setAnimationClass("fade-out");
      setTimeout(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
        setAnimationClass("fade-in");
      }, 2000); // Increased from 500ms to 800ms
    }, 8000); // Increased from 6000ms to 8000ms

    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  const nextBanner = useCallback(() => {
    setAnimationClass("slide-left");
    setTimeout(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      setAnimationClass("fade-in");
    }, 600); // Increased from 300ms to 600ms
  }, [banners.length]);

  const prevBanner = useCallback(() => {
    setAnimationClass("slide-right");
    setTimeout(() => {
      setCurrentBannerIndex(
        (prev) => (prev - 1 + banners.length) % banners.length
      );
      setAnimationClass("fade-in");
    }, 600); // Increased from 300ms to 600ms
  }, [banners.length]);

  const goToBanner = useCallback(
    (index: number) => {
      if (index === currentBannerIndex) return;
      setAnimationClass(
        index > currentBannerIndex ? "slide-left" : "slide-right"
      );
      setTimeout(() => {
        setCurrentBannerIndex(index);
        setAnimationClass("fade-in");
      }, 600); // Increased from 300ms to 600ms
    },
    [currentBannerIndex]
  );

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

  // Preload images for better performance
  useEffect(() => {
    if (!banners.length) return;

    banners.forEach((banner) => {
      if (banner.imageUrl) {
        const img = new Image();
        img.src = banner.imageUrl;
      }
    });
  }, [banners]);

  // Add touch swipe functionality for mobile
  useEffect(() => {
    if (!banners.length || banners.length <= 1) return;

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
  }, [banners.length, nextBanner, prevBanner]);

  if (!isLoaded || banners.length === 0) {
    return null; // Don't render anything if no banners
  }

  return (
    <div
      className="banner-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {banners.map((banner, index) => (
        <div
          key={banner._id || index}
          className={`banner-slide ${
            index === currentBannerIndex ? "active" : ""
          } ${animationClass}`}
          style={{
            backgroundImage: `url(${banner.imageUrl})`,
          }}
        >
          <div className="banner-overlay"></div>
          <div className="banner-content">
            <h1 className="banner-title">
              {language === "en" ? banner.titleEn : banner.title}
            </h1>
            {banner.buttonText && banner.buttonLink && (
              <Link href={banner.buttonLink} className="banner-cta-btn">
                <span className="btn-text">
                  {language === "en" ? banner.buttonTextEn : banner.buttonText}
                </span>
              </Link>
            )}
          </div>
        </div>
      ))}

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
                  index === currentBannerIndex ? "active" : ""
                }`}
                onClick={() => goToBanner(index)}
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
