"use client";

import HomePageForum from "@/components/homePageForum/homePageForum";
import HomePagesHead from "@/components/homePagesHead/homePagesHead";
import HomePageShop from "@/components/homePageShop/homePageShop";
import Banner from "@/components/banner/banner";
import TopItems from "@/components/TopItems/TopItems";
import { GuestReferralBanner } from "@/components/referralBanners/guest-referral-banner";
import { ReferralPromoBanner } from "@/components/referralBanners/referral-promo-banner";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Role } from "@/types/role";

const Home = () => {
  const { language } = useLanguage();
  const { user } = useUser();

  return (
    <div>
      {/* Debug link for PWA testing - shows only for admin users */}
      {user?.role === Role.Admin && (
        <div style={{ 
          position: 'fixed', 
          top: '200px', 
          right: '10px', 
          zIndex: 9999, 
          background: 'red', 
          color: 'white', 
          padding: '5px 10px', 
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <a href="/pwa-debug" style={{ color: 'white', textDecoration: 'none' }}>
            🔧 PWA Debug
          </a>
        </div>
      )}
      <HomePagesHead />
      <div>
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
