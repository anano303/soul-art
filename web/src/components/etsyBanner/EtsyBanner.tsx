"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, ArrowRight, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Role } from "@/types/role";
import { useEtsyEnabled } from "@/hooks/use-etsy-enabled";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { memoryCache } from "@/lib/cache";
import { optimizeCloudinaryUrl } from "@/lib/utils";
import { Product } from "@/types";
import soulartLogo from "@/assets/logo.png";
import "./etsy-banner.css";

// Matches the SoulArt × Etsy campaign hero: navy globe background, gold
// serif headline, three framed artworks and the "listing synced" connector.
// Background image: web/public/etsy-banner-bg.png (gradient fallback).
export default function EtsyBanner() {
  const { language } = useLanguage();
  const { user } = useUser();
  const etsyEnabled = useEtsyEnabled(user?.role === Role.Admin);
  const isKa = language !== "en";

  const { data: artworks } = useQuery<Product[]>({
    queryKey: ["etsyBannerArtworks"],
    enabled: etsyEnabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const cacheKey = "etsy-banner-artworks";
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;
      const res = await fetchWithAuth(
        "/products?page=1&limit=3&sort=-rating&excludeOutOfStock=true",
      );
      const data = await res.json();
      const items = (data.items || []).slice(0, 3);
      memoryCache.set(cacheKey, items, 10 * 60 * 1000);
      return items;
    },
  });

  if (!etsyEnabled) return null;

  const frames = [0, 1, 2].map((i) => {
    const img = artworks?.[i]?.images?.[0];
    return img
      ? optimizeCloudinaryUrl(img, { width: 300, quality: "auto:eco" })
      : null;
  });

  return (
    <section className="etsy-banner-section">
      <div className="etsy-banner-inner Container">
        <div className="etsy-banner-text">
          <span className="etsy-banner-eyebrow">
            {isKa ? "სიახლე: ETSY ინტეგრაცია" : "NEW: ETSY INTEGRATION"}{" "}
            <span className="etsy-banner-spark">✦</span>
          </span>
          <h2 className="etsy-banner-title">
            {isKa ? (
              <>
                განათავსე SoulArt-ზე.
                <br />
                გაყიდე <span className="etsy-banner-gold">Etsy</span>-ზეც.
              </>
            ) : (
              <>
                List on SoulArt.
                <br />
                Sell on <span className="etsy-banner-gold">Etsy</span> too.
              </>
            )}
          </h2>
          <p className="etsy-banner-subtitle">
            {isKa
              ? "გამოაქვეყნე ნამუშევარი ერთხელ და რამდენიმე დაკლიკებით მიაღწიე მილიონობით საერთაშორისო მყიდველამდე."
              : "Publish your artwork once and reach millions of international buyers in just a few clicks."}
          </p>
          <div className="etsy-banner-actions">
            <Link
              href="/admin/products#etsy-button"
              className="etsy-banner-btn-gold"
            >
              {isKa ? "განათავსე შენი ნამუშევარი" : "List your artwork"}
              <ArrowRight size={16} />
            </Link>
            <Link href="/etsy-guide" className="etsy-banner-btn-outline">
              <BookOpen size={16} />
              {isKa ? "გაიგე მეტი" : "Learn more"}
            </Link>
          </div>
        </div>

        <div className="etsy-banner-visual">
          <div className="etsy-banner-frames" aria-hidden="true">
            {[frames[1], frames[0], frames[2]].map((src, i) => (
              <div
                key={i}
                className={`etsy-banner-frame ${i === 1 ? "etsy-banner-frame-main" : ""}`}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" loading="lazy" />
                ) : (
                  <div className="etsy-banner-frame-empty">🎨</div>
                )}
              </div>
            ))}
          </div>

          {/* Listing synced connector */}
          <div className="etsy-banner-sync" aria-hidden="true">
            <div className="etsy-banner-sync-node">
              <div className="etsy-banner-sync-circle">
                <Image
                  src={soulartLogo}
                  alt="SoulArt"
                  width={44}
                  height={44}
                  className="etsy-banner-soulart-logo"
                />
              </div>
              <span>SoulArt</span>
            </div>
            <div className="etsy-banner-sync-line">
              <span className="etsy-banner-sync-check">
                <Check size={15} strokeWidth={3} />
              </span>
              <div className="etsy-banner-sync-caption">
                <strong>
                  {isKa ? "სინქრონიზებულია" : "Listing synced"}
                </strong>
                <em>{isKa ? "მზადაა გასაყიდად" : "Ready to sell"}</em>
              </div>
            </div>
            <div className="etsy-banner-sync-node">
              <div className="etsy-banner-sync-circle">
                <span className="etsy-banner-etsy-e">E</span>
              </div>
              <span>Etsy</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
