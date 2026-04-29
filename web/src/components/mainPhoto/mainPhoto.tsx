"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./mainPhoto.css";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { Role } from "@/types/role";
import SearchBox from "../SearchBox/search-box";
import { getActiveHeroSlides } from "@/modules/admin/api/banner";
import { Banner } from "@/types/banner";

const BrushTrail = dynamic(() => import("../BrushTrail/BrushTrail"), { ssr: false });

// Admin editor - only loaded for admin users
const MainPhotoAdminEditor = dynamic(() => import("./mainPhoto-admin-editor"), { ssr: false });

const CATEGORIES = [
  {
    id: "68768f6f0b55154655a8e882",
    name: "ნახატები",
    nameEn: "Paintings",
    icon: "/loading.png",
  },
  {
    id: "68768f850b55154655a8e88f",
    name: "ხელნაკეთი",
    nameEn: "Handmade",
    icon: "/handmade.png",
  },
];

interface Slide {
  id: string;
  imageUrl: string;
  title?: string;
  titleEn?: string;
  buttonText?: string;
  buttonTextEn?: string;
  buttonLink?: string;
  isActive?: boolean;
}

const MainPhoto = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([
    { id: "default", imageUrl: "/van-gogh.webp" },
  ]);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = user?.role?.toLowerCase() === Role.Admin;

  const fetchActiveSlides = useCallback(async () => {
    try {
      const response = await getActiveHeroSlides();
      if (response.success && response.data && response.data.length > 0) {
        const heroSlides: Slide[] = response.data.map((b: Banner) => ({
          id: b._id,
          imageUrl: b.imageUrl,
          title: b.title,
          titleEn: b.titleEn,
          buttonText: b.buttonText,
          buttonTextEn: b.buttonTextEn,
          buttonLink: b.buttonLink,
        }));
        setSlides([
          { id: "default", imageUrl: "/van-gogh.webp" },
          ...heroSlides,
        ]);
      } else {
        setSlides([{ id: "default", imageUrl: "/van-gogh.webp" }]);
      }
    } catch {
      // Keep default
    }
  }, []);

  // Fetch hero slides from API
  useEffect(() => {
    fetchActiveSlides();
  }, [fetchActiveSlides]);

  const totalSlides = slides.length;

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentSlide((index + totalSlides) % totalSlides);
    },
    [totalSlides],
  );

  const nextSlide = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  // Auto-advance every 6s
  useEffect(() => {
    if (totalSlides <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [totalSlides]);

  // Reset auto-play on manual navigation
  const handleNav = useCallback(
    (direction: "prev" | "next") => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (direction === "prev") prevSlide();
      else nextSlide();
      if (totalSlides > 1) {
        autoPlayRef.current = setInterval(() => {
          setCurrentSlide((prev) => (prev + 1) % totalSlides);
        }, 6000);
      }
    },
    [prevSlide, nextSlide, totalSlides],
  );

  const currentSlideData = slides[currentSlide];
  const isDefaultSlide = currentSlideData.id === "default";

  return (
    <div className="home-container">
      <BrushTrail containerRef={heroRef} />
      <div className="main-hero-section" ref={heroRef}>
        {/* Slide images - only render current, previous and next for performance */}
        {slides.map((slide, index) => {
          const isVisible = index === currentSlide;
          const isAdjacent =
            index === (currentSlide + 1) % totalSlides ||
            index === (currentSlide - 1 + totalSlides) % totalSlides;
          if (!isVisible && !isAdjacent) return null;
          return (
            <Image
              key={slide.id}
              src={slide.imageUrl}
              alt={slide.title || "SoulArt Hero"}
              fill
              priority={index === 0 || index === currentSlide}
              quality={60}
              sizes="100vw"
              fetchPriority={index === currentSlide ? "high" : "auto"}
              className={`hero-slide-img ${isVisible ? "hero-slide-active" : ""}`}
            />
          );
        })}

        <div className="hero-bg-overlay" />

        {/* Content: default slide shows main text, hero slides show their own */}
        <div className="hero-text">
          {isDefaultSlide ? (
            <>
              <h1>{t("home.heroTitle")}</h1>
              <p>{t("home.heroSubtitle")}</p>
            </>
          ) : (
            <>
              <h1>
                {language === "en"
                  ? currentSlideData.titleEn
                  : currentSlideData.title}
              </h1>
              {currentSlideData.buttonText && currentSlideData.buttonLink && (
                <Link
                  href={currentSlideData.buttonLink}
                  className="hero-slide-cta"
                >
                  {language === "en"
                    ? currentSlideData.buttonTextEn
                    : currentSlideData.buttonText}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Category buttons - only on default slide */}
        {isDefaultSlide && (
          <div className="hero-category-buttons">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?page=1&mainCategory=${cat.id}`}
                className="hero-cat-btn"
              >
                <Image
                  src={cat.icon}
                  alt=""
                  width={22}
                  height={22}
                  className="hero-cat-icon"
                />
                {language === "en" ? cat.nameEn : cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Search box - always visible */}
        <div className="search-box">
          <SearchBox />
        </div>

        {/* Arrows - only if multiple slides */}
        {totalSlides > 1 && (
          <>
            <button
              className="hero-arrow hero-arrow-left"
              onClick={() => handleNav("prev")}
              aria-label="Previous slide"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              className="hero-arrow hero-arrow-right"
              onClick={() => handleNav("next")}
              aria-label="Next slide"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {/* Dots - only if multiple slides */}
        {totalSlides > 1 && (
          <div className="hero-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`hero-dot ${index === currentSlide ? "hero-dot-active" : ""}`}
                onClick={() => goToSlide(index)}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Admin editor - dynamically loaded only for admins */}
        {isAdmin && (
          <MainPhotoAdminEditor onSlidesChanged={fetchActiveSlides} />
        )}
      </div>
    </div>
  );
};

export default MainPhoto;
