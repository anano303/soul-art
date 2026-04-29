"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import HomePagesHead from "@/components/homePagesHead/homePagesHead";
import { useLanguage } from "@/hooks/LanguageContext";
import { trackPageView } from "@/lib/ga4-analytics";

// Below-the-fold components - lazy loaded for better FCP/LCP
const TopItems = dynamic(() => import("@/components/TopItems/TopItems"), {
  ssr: false,
  loading: () => <div style={{ height: "310px" }} />,
});
const Banner = dynamic(() => import("@/components/banner/banner"), {
  ssr: false,
  loading: () => <div style={{ height: "80px" }} />,
});

// Lazy load below-the-fold components for better LCP
const PremiumRail = dynamic(
  () => import("@/components/premiumRail/PremiumRail"),
  { ssr: true },
);

const DiscountedRail = dynamic(
  () => import("@/components/discountedRail/DiscountedRail"),
  { ssr: true },
);

const ExclusivePromoRail = dynamic(
  () => import("@/components/exclusivePromoRail/ExclusivePromoRail"),
  { ssr: false },
);

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
