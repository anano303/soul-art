"use client";

import "./benefits.css";
import { useLanguage } from "@/hooks/LanguageContext";

export default function SellerBenefits() {
  const { t } = useLanguage();

  return (
    <section className="seller-benefits">
      <h2 className="SellerTitle">{t("sellerBenefits.title")}</h2>

      <p className="Seller-subtitle">{t("sellerBenefits.subtitle")}</p>

      <div className="grid">
        <div className="benefitsForSellers">
          <h3 className="seller-section-title">
            🌟{t("sellerBenefits.benefits.title")}
          </h3>
          <ul className="list">
            {[...Array(7)].map((_, i) => (
              <li key={i}>{t(`sellerBenefits.benefits.items.${i}`)}</li>
            ))}
          </ul>
        </div>

        <div className="shipping">
          <h3 className="seller-section-title">
            🚚 {t("sellerBenefits.shipping.title")}
          </h3>
          <ul className="list">
            {[...Array(5)].map((_, i) => (
              <li key={i}>{t(`sellerBenefits.shipping.items.${i}`)}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="cta">
        <p className="cta-text">✨{t("sellerBenefits.cta.text")}</p>
        <a href="#seller-register-form" className="cta-button">
          {t("sellerBenefits.cta.button")}
        </a>
      </div>
    </section>
  );
}
