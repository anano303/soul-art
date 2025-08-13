"use client";

import HomePageForum from "@/components/homePageForum/homePageForum";
import HomePagesHead from "@/components/homePagesHead/homePagesHead";
import HomePageShop from "@/components/homePageShop/homePageShop";
import Banner from "@/components/banner/banner";
import TopItems from "@/components/TopItems/TopItems";
import { GuestReferralBanner } from "@/components/referralBanners/guest-referral-banner";
import { ReferralPromoBanner } from "@/components/referralBanners/referral-promo-banner";
import { useLanguage } from "@/hooks/LanguageContext";

const Home = () => {
  const { language } = useLanguage();

  return (
    <div>
      <HomePagesHead />
      <div className="container mx-auto px-4">
        <GuestReferralBanner />
        <ReferralPromoBanner />
      </div>
      <TopItems />
      <Banner />
      {/* Forcing a full remount of HomePageShop when language changes */}
      <HomePageShop key={`home-shop-${language}`} />
      <HomePageForum />
    </div>
  );
};

export default Home;
