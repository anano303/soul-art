"use client";

import { useEffect } from "react";
import HomePageForum from "@/components/homePageForum/homePageForum";
import HomePagesHead from "@/components/homePagesHead/homePagesHead";
import HomePageShop from "@/components/homePageShop/homePageShop";
import Banner from "@/components/banner/banner";
import TopItems from "@/components/TopItems/TopItems";
import { GuestReferralBanner } from "@/components/referralBanners/guest-referral-banner";
import { ReferralPromoBanner } from "@/components/referralBanners/referral-promo-banner";
import { useLanguage } from "@/hooks/LanguageContext";
import DiscountedRail from "@/components/discountedRail/DiscountedRail";
import { trackPageView } from "@/lib/ga4-analytics";

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
      {/* Forcing a full remount of HomePageShop when language changes */}
      <HomePageShop key={`home-shop-${language}`} />
      <HomePageForum />
    </div>
  );
};

export default Home;
