"use client";

import { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import { apiClient } from "@/lib/axios";
import { Product } from "@/types";
import { ProductCard } from "@/modules/products/components/product-card";
import "./ExclusivePromoRail.css";

interface ExclusivePromoRailProps {
  maxProducts?: number;
}

export default function ExclusivePromoRail({
  maxProducts = 20,
}: ExclusivePromoRailProps) {
  const { language } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [promoTitle, setPromoTitle] = useState({
    en: "Exclusive for You!",
    ge: "ექსკლუზიურად შენთვის!",
  });
  const [promoSubtitle, setPromoSubtitle] = useState({
    en: "Special prices just for you",
    ge: "განსაკუთრებული ფასები მხოლოდ შენთვის",
  });
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double-fetch in strict mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

    // Check cookie synchronously
    const salesRef = Cookies.get("sales_ref");
    const hasReferralCode = !!(salesRef && salesRef.startsWith("SM_"));

    // Fetch campaign and promo products IN PARALLEL for speed
    const campaignPromise = fetch(`${baseUrl}/campaigns/active`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.campaign || null)
      .catch(() => null);

    const productsPromise = apiClient
      .get("/products", {
        params: { limit: maxProducts * 2, hasPromo: "true" },
      })
      .then((res) => res.data.items || res.data.products || [])
      .catch(() => [] as Product[]);

    Promise.all([campaignPromise, productsPromise]).then(
      ([campaign, allProducts]) => {
        const isAllVisitors = campaign?.appliesTo?.includes("all_visitors");
        const isReferralCampaign = campaign?.appliesTo?.includes(
          "influencer_referrals",
        );

        // Show if: all_visitors campaign OR referral campaign + cookie
        if (!isAllVisitors && !(isReferralCampaign && hasReferralCode)) {
          setIsVisible(false);
          setIsLoading(false);
          return;
        }

        // Update titles based on campaign type
        if (isAllVisitors) {
          setPromoTitle({
            en: campaign?.badgeText || "Special Promotion!",
            ge: campaign?.badgeTextGe || "აქცია!",
          });
          setPromoSubtitle({
            en: "This week only — artworks at special prices",
            ge: "შეზღუდული დროით — ნამუშევრები წარმოუდგენლად დაბალ ფასად",
          });
        }

        setIsVisible(true);

        // Shuffle and take maxProducts (backend already filtered hasPromo)
        const shuffled = (allProducts as Product[]).sort(
          () => Math.random() - 0.5,
        );
        const selected = shuffled.slice(0, maxProducts);

        console.log(
          "[ExclusivePromoRail] Promo products:",
          (allProducts as Product[]).length,
          "showing:",
          selected.length,
        );

        setProducts(selected);
        setIsLoading(false);
      },
    );
  }, [maxProducts]);

  // Don't render if campaign doesn't apply
  if (!isVisible) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <section className="exclusive-promo-section">
        <div className="exclusive-promo-header">
          <div className="exclusive-promo-icon">
            <Image src="/git.png" alt="Gift" width={64} height={64} />
          </div>
          <div className="exclusive-promo-titles">
            <h2 className="exclusive-promo-title">
              {language === "en"
                ? "Loading exclusive deals..."
                : "იტვირთება..."}
            </h2>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="exclusive-promo-section">
      <div className="exclusive-promo-header">
        <div className="exclusive-promo-icon">
          <Image src="/git.png" alt="Gift" width={64} height={64} />
        </div>
        <div className="exclusive-promo-titles">
          <h2 className="exclusive-promo-title">
            {language === "en" ? promoTitle.en : promoTitle.ge}
          </h2>
          <p className="exclusive-promo-subtitle">
            {language === "en" ? promoSubtitle.en : promoSubtitle.ge}
          </p>
        </div>
        <Link href="/shop?promo=true" className="exclusive-view-all">
          {language === "en" ? "View All" : "ყველას ნახვა"} →
        </Link>
      </div>

      <div className="exclusive-products-scroll">
        <div className="exclusive-products-container">
          {products.map((product) => (
            <div key={product._id} className="exclusive-product-wrapper">
              <div
                className="exclusive-card-override"
                style={{
                  width: "100%",
                  // CSS variables won't help here, we need to apply styles through CSS
                }}
              >
                <ProductCard product={product} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
