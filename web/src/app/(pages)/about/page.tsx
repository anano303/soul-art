"use client";

import Link from "next/link";
import "./about.css";
import { useLanguage } from "@/hooks/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="about-container">
      <h1 className="about-title">{t("about.title")}</h1>

      <div className="about-section">
        <p className="about-description">{t("about.description")}</p>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">{t("about.mission.title")}</h2>
        <p>{t("about.mission.description")}</p>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">{t("about.goal.title")}</h2>
        <p>{t("about.goal.description")}</p>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">{t("about.vision.title")}</h2>
        <p>{t("about.vision.description")}</p>
      </div>

      <div className="about-section about-highlight">
        <h2 className="about-subtitle">{t("about.whyUs.title")}</h2>
        <p>{t("about.whyUs.description")}</p>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">{t("about.becomeSeller.title")}</h2>
        <p>{t("about.becomeSeller.description")}</p>
        <Link
          href="/sellers-register"
          className="about-button about-seller-button"
        >
          {t("about.becomeSeller.button")}
        </Link>
      </div>

      <div className="about-section">
        <h2 className="about-subtitle">{t("about.buyUnique.title")}</h2>
        <p>{t("about.buyUnique.description")}</p>
        <Link href="/shop" className="about-button about-shop-button">
          {t("about.buyUnique.button")}
        </Link>
      </div>
    </div>
  );
}
