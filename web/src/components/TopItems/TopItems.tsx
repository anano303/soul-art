"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./TopItems.module.css";
import noPhoto from "../../assets/nophoto.webp";
import bogLogo from "../../../public/bog.webp";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Product } from "@/types";
import LoadingAnim from "../loadingAnim/loadingAnim";
import { memoryCache } from "@/lib/cache";
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  Users,
  Package,
  Star,
  TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { optimizeCloudinaryUrl } from "@/lib/utils";

const TopItems: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  const { data: topProducts, isLoading } = useQuery({
    queryKey: ["topProducts"],
    queryFn: async () => {
      const cacheKey = "topProducts-rating";

      // Try cache first (10 minutes cache)
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const searchParams = new URLSearchParams({
        page: "1",
        limit: "20",
        sort: "-rating",
      });
      const response = await fetchWithAuth(
        `/products?${searchParams.toString()}`
      );
      const data = await response.json();
      const topItems = data.items.slice(0, 7);

      // Cache for 10 minutes
      memoryCache.set(cacheKey, topItems, 10 * 60 * 1000);
      return topItems;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    // Duplicate content for seamless loop
    const inner = scroller.querySelector(`.${styles.inner}`) as HTMLElement;
    if (!inner) return;

    const clone = inner.cloneNode(true) as HTMLElement;
    scroller.appendChild(clone);

    // Enable overflow-x for manual scrolling
    scroller.style.overflowX = "auto";

    // Apply margin-top to every second .easel element
    const easels = document.querySelectorAll(`.${styles.easel}`);
    easels.forEach((easel, index) => {
      if ((index + 1) % 2 === 0) {
        (easel as HTMLElement).style.marginTop = "20%";
      }
    });

    // Auto-scroll animation
    let animationId: number;
    let isPaused = false;
    let isUserScrolling = false;
    let userScrollTimeout: NodeJS.Timeout;
    let ignoreNextScrollEvent = false;
    let ignoreResetId: number | null = null;

    // Faster speed for mobile
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const scrollSpeed = isMobile ? 2.5 : 1.2; // Increased speed for both desktop and mobile

    const resetIgnoreFlag = () => {
      if (ignoreResetId) cancelAnimationFrame(ignoreResetId);
      ignoreResetId = requestAnimationFrame(() => {
        ignoreNextScrollEvent = false;
        ignoreResetId = null;
      });
    };

    const autoScroll = () => {
      if (!isPaused && !isUserScrolling && scroller) {
        ignoreNextScrollEvent = true;
        scroller.scrollLeft += scrollSpeed;

        // Seamless loop: reset when reaching the original content width
        const originalWidth = inner.scrollWidth;
        if (scroller.scrollLeft >= originalWidth) {
          scroller.scrollLeft = 0;
        }

        resetIgnoreFlag();
      }
      animationId = requestAnimationFrame(autoScroll);
    };

    // Pause on hover (desktop)
    const handleMouseEnter = () => {
      isPaused = true;
    };
    const handleMouseLeave = () => {
      isPaused = false;
    };

    // Detect horizontal touch for pausing auto-scroll
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchEndX = e.touches[0].clientX;
      const touchEndY = e.touches[0].clientY;
      const diffX = Math.abs(touchEndX - touchStartX);
      const diffY = Math.abs(touchEndY - touchStartY);

      // Only pause auto-scroll if horizontal swipe (not vertical)
      if (diffX > diffY && diffX > 10) {
        isUserScrolling = true;
        clearTimeout(userScrollTimeout);
        userScrollTimeout = setTimeout(() => {
          isUserScrolling = false;
        }, 3000);
      }
    };

    // Detect user scrolling (only manual scroll, not programmatic)
    const handleUserScroll = () => {
      if (ignoreNextScrollEvent) {
        return;
      }

      isUserScrolling = true;
      clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        isUserScrolling = false;
      }, 3000); // Resume auto-scroll 3s after user stops
    };

    scroller.addEventListener("mouseenter", handleMouseEnter);
    scroller.addEventListener("mouseleave", handleMouseLeave);
    scroller.addEventListener("scroll", handleUserScroll, { passive: true });
    scroller.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    scroller.addEventListener("touchmove", handleTouchMove, { passive: true });

    animationId = requestAnimationFrame(autoScroll);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(userScrollTimeout);
      scroller.removeEventListener("mouseenter", handleMouseEnter);
      scroller.removeEventListener("mouseleave", handleMouseLeave);
      scroller.removeEventListener("scroll", handleUserScroll);
      scroller.removeEventListener("touchstart", handleTouchStart);
      scroller.removeEventListener("touchmove", handleTouchMove);
      if (ignoreResetId) {
        cancelAnimationFrame(ignoreResetId);
      }
      if (clone && clone.parentElement) {
        clone.parentElement.removeChild(clone);
      }
    };
  }, [topProducts]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <LoadingAnim />
      </div>
    );
  }

  // Trust badges data
  const trustBadges = [
    {
      id: "payment",
      icon: language === "en" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <Image
            src={bogLogo}
            alt="BOG"
            width={45}
            height={45}
            className={styles.bogLogoSmall}
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="22" viewBox="0 0 124 33" aria-label="PayPal">
            <path fill="#253B80" d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.804l1.77-11.209a.57.57 0 0 0-.561-.657zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.392-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z"/>
            <path fill="#179BD7" d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.804l1.771-11.209a.571.571 0 0 0-.565-.657zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.392-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822a.949.949 0 0 0 .939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z" />
          </svg>
        </div>
      ) : (
        <Image
          src={bogLogo}
          alt="BOG"
          width={55}
          height={55}
          className={styles.bogLogoSmall}
        />
      ),
      title: t("home.trustBadges.securePayment"),
      description: t("home.trustBadges.securePaymentDesc"),
    },
    {
      id: "shipping",
      icon: <Truck size={24} strokeWidth={2.5} />,
      title: t("home.trustBadges.freeShipping"),
      description: t("home.trustBadges.freeShippingDesc"),
    },
    {
      id: "quality",
      icon: <ShieldCheck size={24} strokeWidth={2.5} />,
      title: t("home.trustBadges.qualityGuarantee"),
      description: t("home.trustBadges.qualityGuaranteeDesc"),
    },
    {
      id: "refund",
      icon: <RotateCcw size={24} strokeWidth={2.5} />,
      title: t("home.trustBadges.fastRefund"),
      description: t("home.trustBadges.fastRefundDesc"),
    },
  ];

  // Social proof stats as badges
  const socialStats = [
    {
      id: "artists",
      icon: <Users size={28} strokeWidth={2.5} />,
      value: "500+",
      label: language === "ge" ? "მხატვარი" : "Artists",
      color: "#007bff",
    },
    {
      id: "artworks",
      icon: <Package size={28} strokeWidth={2.5} />,
      value: "2,000+",
      label: language === "ge" ? "ნამუშევარი" : "Artworks",
      color: "#28a745",
    },
    {
      id: "rating",
      icon: <Star size={28} strokeWidth={2.5} />,
      value: "4.8/5",
      label: language === "ge" ? "შეფასება" : "Rating",
      color: "#ffc107",
    },
    {
      id: "satisfaction",
      icon: <TrendingUp size={28} strokeWidth={2.5} />,
      value: "95%",
      label: language === "ge" ? "კმაყოფილება" : "Satisfaction",
      color: "#6f42c1",
    },
  ];

  // Combine all marketing items (badges + stats)
  const allMarketingItems = [...trustBadges, ...socialStats];

  // Interleave products with marketing items
  const interleavedItems: React.ReactElement[] = [];
  let marketingIndex = 0;

  topProducts?.forEach((product: Product, index: number) => {
    // Add product
    interleavedItems.push(
      <Link
        href={`/products/${product._id}`}
        key={`product-${product._id}`}
        className={styles.itemLink}
      >
        <div className={styles.easel}>
          <div className={`${styles.easelLeg} ${styles.easelLeftLeg}`}></div>
          <div className={`${styles.easelLeg} ${styles.easelRightLeg}`}></div>
          <div className={`${styles.easelLeg} ${styles.easelBackLeg}`}></div>
          <div className={styles.board}>
            <Image
              src={
                optimizeCloudinaryUrl(product.images[0], {
                  width: 200,
                  quality: "auto:eco",
                }) || noPhoto
              }
              alt={product.name}
              fill
              sizes="(max-width: 768px) 150px, 200px"
              className={styles.productImage}
              style={{ objectFit: "cover", width: "100%" }}
              loading={index < 3 ? "eager" : "lazy"}
            />
          </div>
        </div>
      </Link>
    );

    // Add marketing item after each product (if available)
    if (marketingIndex < allMarketingItems.length) {
      const item = allMarketingItems[marketingIndex];

      // Check if it's a badge or stat
      if ("title" in item) {
        // Trust Badge
        interleavedItems.push(
          <div key={`badge-${item.id}`} className={styles.itemLink}>
            <div className={styles.easel}>
              <div
                className={`${styles.easelLeg} ${styles.easelLeftLeg}`}
              ></div>
              <div
                className={`${styles.easelLeg} ${styles.easelRightLeg}`}
              ></div>
              <div
                className={`${styles.easelLeg} ${styles.easelBackLeg}`}
              ></div>
              <div
                className={`${styles.board} ${styles.badgeBoard}`}
                data-badge={item.id}
              >
                <div className={styles.badgeContent}>
                  <div className={styles.badgeIcon}>{item.icon}</div>
                  <div className={styles.badgeText}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        // Social Stat
        interleavedItems.push(
          <div key={`stat-${item.id}`} className={styles.itemLink}>
            <div className={styles.easel}>
              <div
                className={`${styles.easelLeg} ${styles.easelLeftLeg}`}
              ></div>
              <div
                className={`${styles.easelLeg} ${styles.easelRightLeg}`}
              ></div>
              <div
                className={`${styles.easelLeg} ${styles.easelBackLeg}`}
              ></div>
              <div
                className={`${styles.board} ${styles.statBoard}`}
                data-stat={item.id}
              >
                <div className={styles.statContent}>
                  <div
                    className={styles.statIcon}
                    style={{ color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div
                    className={styles.statValue}
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </div>
                  <div className={styles.statLabel}>{item.label}</div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      marketingIndex++;
    }
  });

  return (
    <div className={styles.container}>
      <div className={styles.scroller} ref={scrollRef}>
        <div className={styles.inner}>{interleavedItems}</div>
      </div>
    </div>
  );
};

export default TopItems;
