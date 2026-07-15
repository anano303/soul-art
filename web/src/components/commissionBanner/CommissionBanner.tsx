"use client";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import "./commission-banner.css";

export default function CommissionBanner() {
  const { language } = useLanguage();

  return (
    <section className="commission-banner-section">
      <div className="commission-banner-bg" aria-hidden="true">
        <Image
          src="/images/order.png"
          alt=""
          fill
          sizes="100vw"
          priority
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        <div className="commission-banner-overlay" />
      </div>
      <div className="commission-banner-inner Container">
        <div className="commission-banner-text">
          <span className="commission-banner-tag">
            🎨 {language === "en" ? "Custom Order" : "ინდივიდუალური შეკვეთა"}
          </span>
          <h2 className="commission-banner-title">
            {language === "en"
              ? "Order a custom portrait, caricature or a copy of any painting"
              : "შეუკვეთე ინდივიდუალური პორტრეტი, კარიკატურა ან ნებისმიერი ნახატის ასლი"}
          </h2>
          <p className="commission-banner-desc">
            {language === "en"
              ? "Upload a photo, describe what you want, and get offers from several artists within 24 hours."
              : "ატვირთე ფოტო, აღწერე რა გინდა და 24 საათის განმავლობაში მიიღე ფასები რამდენიმე მხატვრისგან."}
          </p>
          <div className="commission-banner-steps">
            <span className="commission-step">
              📷 {language === "en" ? "Upload" : "ატვირთე"}
            </span>
            <span className="commission-step">
              💬 {language === "en" ? "Get offers" : "მიიღე შეთავაზებები"}
            </span>
            <span className="commission-step">
              🎁 {language === "en" ? "Choose & pay" : "აირჩიე და გადაიხადე"}
            </span>
          </div>
          <Link href="/commissions/new" className="btn-commission-cta">
            {language === "en" ? "Place an Order" : "შეკვეთის განთავსება"}
          </Link>
        </div>

        <div className="commission-banner-art" aria-hidden="true">
          <div className="commission-frame commission-frame-1">🖼️</div>
          <div className="commission-frame commission-frame-2">✏️</div>
          <div className="commission-frame commission-frame-3">🐾</div>
        </div>
      </div>
    </section>
  );
}
