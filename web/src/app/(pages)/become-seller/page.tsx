"use client";

import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import styles from "./become-seller.module.css";
import "@/components/sellerBenefits/benefits.css";

export default function BecomeSellerPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <section className="seller-benefits">
        <h2 className="SellerTitle">{t("sellerBenefits.title")}</h2>
        <p className="Seller-subtitle">{t("sellerBenefits.subtitle")}</p>

        <div className="grid">
          <div className="benefitsForSellers">
            <h3 className="seller-section-title">
              🌟{t("sellerBenefits.benefits.title")}
            </h3>
            <ul className="list">
              {[...Array(6)].map((_, i) => (
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
          <Link href="/sellers-register" className="cta-button">
            {t("sellerBenefits.cta.button")}
          </Link>
        </div>
      </section>
    </div>
  );
}
