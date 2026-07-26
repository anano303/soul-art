"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import HomePagesHead from "@/components/homePagesHead/homePagesHead";
import { useLanguage } from "@/hooks/LanguageContext";
import { trackPageView } from "@/lib/ga4-analytics";
import VoucherBanner from "@/components/voucherBanner/VoucherBanner";
import GuaranteeBanner from "@/components/guaranteeBanner/GuaranteeBanner";
// Static import (not ssr:false) so the SEO body copy is in the server HTML.
import WhySoulArt from "@/components/whySoulArt/WhySoulArt";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Role } from "@/types/role";
import { useEtsyEnabled } from "@/hooks/use-etsy-enabled";

const EtsyBanner = dynamic(() => import("@/components/etsyBanner/EtsyBanner"), {
  ssr: false,
  loading: () => null,
});

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

// const SpringCollection = dynamic(
//   () => import("@/components/SpringCollection/SpringCollection"),
//   { ssr: false, loading: () => <div style={{ minHeight: "300px" }} /> },
// );

const HomePageShop = dynamic(
  () => import("@/components/homePageShop/homePageShop"),
  { ssr: false, loading: () => <div style={{ minHeight: "400px" }} /> },
);

const CommissionBanner = dynamic(
  () => import("@/components/commissionBanner/CommissionBanner"),
  { ssr: false, loading: () => <div style={{ minHeight: "200px" }} /> },
);

const PopularArtists = dynamic(
  () => import("@/components/popularArtists/PopularArtists"),
  { ssr: false, loading: () => <div style={{ minHeight: "300px" }} /> },
);

const HomePageForum = dynamic(
  () => import("@/components/homePageForum/homePageForum"),
  { ssr: false, loading: () => <div style={{ minHeight: "300px" }} /> },
);

const HomeFAQ = dynamic(() => import("@/components/homeFAQ/HomeFAQ"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "200px" }} />,
});

export default function HomeContent() {
  const { language } = useLanguage();
  const { user } = useUser();
  // Etsy feature flag also gates the new section arrangement for testing
  const etsyEnabled = useEtsyEnabled(user?.role === Role.Admin);

  useEffect(() => {
    trackPageView("/", "Homepage");
  }, []);

  return (
    <div>
      <HomePagesHead />
      <TopItems />

      {etsyEnabled ? (
        // New arrangement (behind the Etsy feature flag):
        // Etsy banner → promo → premium → custom orders → deals → ads → gifts
        <>
          <EtsyBanner />
          <ExclusivePromoRail />
          <PremiumRail />
          <CommissionBanner />
          <DiscountedRail />
          <Banner />
          <GiftCategories />
        </>
      ) : (
        // Original arrangement
        <>
          <CommissionBanner />
          <ExclusivePromoRail />
          <PremiumRail />
          <Banner />
          <DiscountedRail />
          <GiftCategories />
        </>
      )}

      {/* Vouchers → paintings → guarantee → handmade (independent of the flag) */}
      <VoucherBanner />
      {/* <SpringCollection /> */}
      <HomePageShop key={`home-shop-paintings-${language}`} section="paintings" />
      <GuaranteeBanner />
      <HomePageShop key={`home-shop-rest-${language}`} section="rest" />

      <PopularArtists />
      <WhySoulArt />
      <HomeFAQ />
      <HomePageForum />
    </div>
  );
}
