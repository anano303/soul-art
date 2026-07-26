"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Role } from "@/types/role";
import { useEtsyEnabled } from "@/hooks/use-etsy-enabled";
import "./etsy-banner.css";

// Visual + copy match the SoulArt × Etsy FB campaign banners:
// navy background, gold accents, connected SoulArt ○—○ Etsy circles
export default function EtsyBanner() {
  const { language } = useLanguage();
  const { user } = useUser();
  const etsyEnabled = useEtsyEnabled(user?.role === Role.Admin);
  const isKa = language !== "en";

  if (!etsyEnabled) return null;

  return (
    <section className="etsy-banner-section">
      <div className="etsy-banner-inner Container">
        <div className="etsy-banner-text">
          <span className="etsy-banner-eyebrow">
            {isKa
              ? "ახალი ფუნქცია ხელოვანებისთვის"
              : "A new feature for artists"}
          </span>
          <h2 className="etsy-banner-title">
            {isKa ? (
              <>
                ერთი დაკლიკება — და შენ უკვე{" "}
                <span className="etsy-banner-gold">Etsy</span>-ზეც ხარ
              </>
            ) : (
              <>
                One click — and you&apos;re on{" "}
                <span className="etsy-banner-gold">Etsy</span> too
              </>
            )}
          </h2>
          <p className="etsy-banner-subtitle">
            {isKa
              ? "განათავსე შენი ნამუშევრები SoulArt-ზე ერთხელ და ერთი ღილაკით გამოაქვეყნე ისინი Etsy-ზეც — მილიონობით საერთაშორისო მყიდველთან ერთად."
              : "List your works on SoulArt once and publish them to Etsy with a single click — reaching millions of international buyers."}
          </p>
          <div className="etsy-banner-actions">
            <Link
              href="/admin/products#etsy-button"
              className="etsy-banner-btn-gold"
            >
              {isKa ? "განათავსე შენი ნამუშევარი" : "List your artwork"}
            </Link>
            <Link href="/etsy-guide" className="etsy-banner-btn-outline">
              <BookOpen size={16} />
              {isKa ? "გაიგე მეტი" : "Learn more"}
            </Link>
          </div>
        </div>

        <div className="etsy-banner-visual" aria-hidden="true">
          <div className="etsy-banner-circle">
            <span className="etsy-banner-brand">
              Soul<span className="etsy-banner-gold">Art</span>
            </span>
          </div>
          <div className="etsy-banner-line">
            <span className="etsy-banner-dot" />
            <span className="etsy-banner-dot" />
          </div>
          <div className="etsy-banner-circle">
            <span className="etsy-banner-brand etsy-banner-etsy-word">
              Etsy
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
