"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import HomePagesHead from "@/components/homePagesHead/homePagesHead";
import { useLanguage } from "@/hooks/LanguageContext";
import { trackPageView } from "@/lib/ga4-analytics";

// Above-the-fold: hero slider
// Below-the-fold components - all ssr: false to prevent hydration blocking
const TopItems = dynamic(() => import("@/components/TopItems/TopItems"), {
  ssr: false,
  loading: () => <div style={{ height: "310px" }} />,
});
const Banner = dynamic(() => import("@/components/banner/banner"), {
  ssr: false,
  loading: () => <div style={{ height: "80px" }} />,
});

const ExclusivePromoRail = dynamic(
  () => import("@/components/exclusivePromoRail/ExclusivePromoRail"),
  { ssr: false, loading: () => <div style={{ minHeight: "200px" }} /> },
);

const PremiumRail = dynamic(
  () => import("@/components/premiumRail/PremiumRail"),
  { ssr: false, loading: () => <div style={{ minHeight: "300px" }} /> },
);

const DiscountedRail = dynamic(
  () => import("@/components/discountedRail/DiscountedRail"),
  { ssr: false, loading: () => <div style={{ minHeight: "300px" }} /> },
);

const GiftCategories = dynamic(
  () => import("@/components/giftCategories/GiftCategories"),
  { ssr: false, loading: () => <div style={{ minHeight: "200px" }} /> },
);

const SpringCollection = dynamic(
  () => import("@/components/SpringCollection/SpringCollection"),
  { ssr: false, loading: () => <div style={{ minHeight: "300px" }} /> },
);

const HomePageShop = dynamic(
  () => import("@/components/homePageShop/homePageShop"),
  { ssr: false, loading: () => <div style={{ minHeight: "400px" }} /> },
);

const PopularArtists = dynamic(
  () => import("@/components/popularArtists/PopularArtists"),
  { ssr: false, loading: () => <div style={{ minHeight: "300px" }} /> },
);

const HomePageForum = dynamic(
  () => import("@/components/homePageForum/homePageForum"),
  { ssr: false, loading: () => <div style={{ minHeight: "300px" }} /> },
);

const HomeFAQ = dynamic(
  () => import("@/components/homeFAQ/HomeFAQ"),
  { ssr: false, loading: () => <div style={{ minHeight: "200px" }} /> },
);

export default function HomeContent() {
  const { language } = useLanguage();

  useEffect(() => {
    trackPageView("/", "Homepage");
  }, []);

  return (
    <div>
      <HomePagesHead />
      <TopItems />
      <Banner />
      <ExclusivePromoRail />
      <PremiumRail />
      <DiscountedRail />
      <GiftCategories />
      <SpringCollection />
      <HomePageShop key={`home-shop-${language}`} />
      <PopularArtists />
      <HomeFAQ />
      <HomePageForum />
    </div>
  );
}
