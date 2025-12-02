"use client";

import React, { useRef, useEffect } from "react";
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
    if (scrollRef.current) {
      scrollRef.current.innerHTML += scrollRef.current.innerHTML;
    }

    // Apply margin-top to every second .easel element
    const easels = document.querySelectorAll(`.${styles.easel}`);
    easels.forEach((easel, index) => {
      if ((index + 1) % 2 === 0) {
        (easel as HTMLElement).style.marginTop = "20%";
      }
    });
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
        // Trust Badge as Street Art Graffiti
        interleavedItems.push(
          <div key={`badge-${item.id}`} className={styles.graffitiBadge} data-badge={item.id}>
            <div className={styles.graffitiContent}>
              <div className={styles.graffitiIcon}>{item.icon}</div>
              <div className={styles.graffitiText}>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          </div>
        );
      } else {
        // Social Stat as Street Art Graffiti
        interleavedItems.push(
          <div key={`stat-${item.id}`} className={styles.graffitiStat} data-stat={item.id}>
            <div className={styles.graffitiStatContent}>
              <div className={styles.graffitiStatIcon} style={{ color: item.color }}>
                {item.icon}
              </div>
              <div className={styles.graffitiStatValue} style={{ color: item.color }}>
                {item.value}
              </div>
              <div className={styles.graffitiStatLabel}>{item.label}</div>
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
