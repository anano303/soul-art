"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./TopItems.module.css";
import noPhoto from "../../assets/nophoto.webp";
import bogLogo from "../../../public/bog.jpg";
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
    scroller.style.overflowX = 'auto';

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
    let lastScrollLeft = 0;
    
    // Faster speed for mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const scrollSpeed = isMobile ? 2.5 : 1.2; // Increased speed for both desktop and mobile
    
    const autoScroll = () => {
      if (!isPaused && !isUserScrolling && scroller) {
        scroller.scrollLeft += scrollSpeed;
        lastScrollLeft = scroller.scrollLeft;
        
        // Seamless loop: reset when reaching the original content width
        const originalWidth = inner.scrollWidth;
        if (scroller.scrollLeft >= originalWidth) {
          scroller.scrollLeft = 0;
          lastScrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(autoScroll);
    };

    // Pause on hover (desktop)
    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };
    
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
      // Check if scroll was caused by user (not our auto-scroll)
      if (Math.abs(scroller.scrollLeft - lastScrollLeft) > scrollSpeed * 2) {
        isUserScrolling = true;
        clearTimeout(userScrollTimeout);
        userScrollTimeout = setTimeout(() => {
          isUserScrolling = false;
        }, 3000); // Resume auto-scroll 3s after user stops
      }
      lastScrollLeft = scroller.scrollLeft;
    };
    
    scroller.addEventListener('mouseenter', handleMouseEnter);
    scroller.addEventListener('mouseleave', handleMouseLeave);
    scroller.addEventListener('scroll', handleUserScroll, { passive: true });
    scroller.addEventListener('touchstart', handleTouchStart, { passive: true });
    scroller.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    animationId = requestAnimationFrame(autoScroll);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(userScrollTimeout);
      scroller.removeEventListener('mouseenter', handleMouseEnter);
      scroller.removeEventListener('mouseleave', handleMouseLeave);
      scroller.removeEventListener('scroll', handleUserScroll);
      scroller.removeEventListener('touchstart', handleTouchStart);
      scroller.removeEventListener('touchmove', handleTouchMove);
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
      icon: (
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
              src={product.images[0] || noPhoto}
              alt={product.name}
              fill
              className={styles.productImage}
              style={{ objectFit: "cover", width: "100%" }}
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
                    <h4>{item.title}</h4>
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
      <div 
        className={styles.scroller} 
        ref={scrollRef}
      >
        <div className={styles.inner}>{interleavedItems}</div>
      </div>
    </div>
  );
};

export default TopItems;
