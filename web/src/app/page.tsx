"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import HomePagesHead from "@/components/homePagesHead/homePagesHead";
import TopItems from "@/components/TopItems/TopItems";
import Banner from "@/components/banner/banner";
import PremiumRail from "@/components/premiumRail/PremiumRail";
import DiscountedRail from "@/components/discountedRail/DiscountedRail";
import ExclusivePromoRail from "@/components/exclusivePromoRail/ExclusivePromoRail";
import { useLanguage } from "@/hooks/LanguageContext";
import { trackPageView } from "@/lib/ga4-analytics";

// Lazy load below-the-fold components for better LCP
const GiftCategories = dynamic(
  () => import("@/components/giftCategories/GiftCategories"),
  {
    loading: () => <div style={{ minHeight: "200px" }} />,
    ssr: true,
  },
);

const SpringCollection = dynamic(
  () => import("@/components/SpringCollection/SpringCollection"),
  {
    loading: () => <div style={{ minHeight: "300px" }} />,
    ssr: true,
  },
);

const HomePageShop = dynamic(
  () => import("@/components/homePageShop/homePageShop"),
  {
    loading: () => <div style={{ minHeight: "400px" }} />,
    ssr: true,
  },
);

const PopularArtists = dynamic(
  () => import("@/components/popularArtists/PopularArtists"),
  {
    loading: () => <div style={{ minHeight: "300px" }} />,
    ssr: true,
  },
);

const HomePageForum = dynamic(
  () => import("@/components/homePageForum/homePageForum"),
  {
    loading: () => <div style={{ minHeight: "300px" }} />,
    ssr: true,
  },
);

const HomeFAQ = dynamic(
  () => import("@/components/homeFAQ/HomeFAQ"),
  {
    loading: () => <div style={{ minHeight: "200px" }} />,
    ssr: true,
  },
);

const Home = () => {
  const { language } = useLanguage();

  useEffect(() => {
    // Track homepage view
    trackPageView("/", "Homepage");
  }, []);

  return (
    <div>
      <HomePagesHead />
      <TopItems />
      <Banner />
      {/* Exclusive promo section - moved below fold to prevent CLS */}
      <ExclusivePromoRail />
      <PremiumRail />
      <DiscountedRail />
      <GiftCategories />
      <SpringCollection />
      {/* Forcing a full remount of HomePageShop when language changes */}
      <HomePageShop key={`home-shop-${language}`} />
      <PopularArtists />
      <HomeFAQ />
      <HomePageForum />
    </div>
  );
};

export default Home;
