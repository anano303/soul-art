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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

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
    let lastTouchTime = 0;
    
    // Faster speed for mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const scrollSpeed = isMobile ? 1.8 : 0.5; // Much faster on mobile
    
    const autoScroll = () => {
      const timeSinceTouch = Date.now() - lastTouchTime;
      const shouldScroll = !isPaused && !isDragging && timeSinceTouch > 100;
      
      if (shouldScroll && scroller) {
        scroller.scrollLeft += scrollSpeed;
        
        // Seamless loop: reset when reaching halfway point
        const maxScroll = inner.scrollWidth;
        if (scroller.scrollLeft >= maxScroll) {
          scroller.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(autoScroll);
    };

    // Pause on hover (desktop)
    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };
    
    // Track touch for mobile
    const handleTouchEvent = () => {
      lastTouchTime = Date.now();
      isPaused = true;
      setTimeout(() => { isPaused = false; }, 2000); // Resume after 2s
    };
    
    scroller.addEventListener('mouseenter', handleMouseEnter);
    scroller.addEventListener('mouseleave', handleMouseLeave);
    scroller.addEventListener('touchstart', handleTouchEvent, { passive: true });
    scroller.addEventListener('touchmove', handleTouchEvent, { passive: true });
    
    animationId = requestAnimationFrame(autoScroll);

    return () => {
      cancelAnimationFrame(animationId);
      scroller.removeEventListener('mouseenter', handleMouseEnter);
      scroller.removeEventListener('mouseleave', handleMouseLeave);
      scroller.removeEventListener('touchstart', handleTouchEvent);
      scroller.removeEventListener('touchmove', handleTouchEvent);
      if (clone && clone.parentElement) {
        clone.parentElement.removeChild(clone);
      }
    };
  }, [topProducts, isDragging]);

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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.inner}>{interleavedItems}</div>
      </div>
    </div>
  );
};

export default TopItems;
