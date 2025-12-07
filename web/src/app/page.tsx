"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import HomePagesHead from "@/components/homePagesHead/homePagesHead";
import TopItems from "@/components/TopItems/TopItems";
import Banner from "@/components/banner/banner";
import DiscountedRail from "@/components/discountedRail/DiscountedRail";
import { useLanguage } from "@/hooks/LanguageContext";
import { trackPageView } from "@/lib/ga4-analytics";

// Lazy load below-the-fold components for better LCP
const GiftCategories = dynamic(
  () => import("@/components/giftCategories/GiftCategories"),
  {
    loading: () => <div style={{ minHeight: "200px" }} />,
    ssr: true,
  }
);

const NewYearPaintings = dynamic(
  () => import("@/components/newYearPaintings/NewYearPaintings"),
  {
    loading: () => <div style={{ minHeight: "300px" }} />,
    ssr: true,
  }
);

const HomePageShop = dynamic(
  () => import("@/components/homePageShop/homePageShop"),
  {
    loading: () => <div style={{ minHeight: "400px" }} />,
    ssr: true,
  }
);

const HomePageForum = dynamic(
  () => import("@/components/homePageForum/homePageForum"),
  {
    loading: () => <div style={{ minHeight: "300px" }} />,
    ssr: true,
  }
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
      {/* <div>
        <GuestReferralBanner />
        <ReferralPromoBanner />
      </div> */}
      <TopItems />
      <Banner />
      <DiscountedRail />
      <GiftCategories />
      <NewYearPaintings />
      {/* Forcing a full remount of HomePageShop when language changes */}
      <HomePageShop key={`home-shop-${language}`} />
      <HomePageForum />
    </div>
  );
};

export default Home;
