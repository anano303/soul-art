"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import { TRANSLATIONS } from "@/hooks/Languages";
import "./sales-manager-info.css";

export function SalesManagerInfo() {
  const { t, language } = useLanguage();

  // Get arrays directly from translations
  const translations = TRANSLATIONS[language] as {
    auth: {
      salesManagerInfo: {
        howItWorksSteps: string[];
        benefits: string[];
      };
    };
  };
  
  const howItWorksSteps = translations.auth.salesManagerInfo.howItWorksSteps;
  const benefits = translations.auth.salesManagerInfo.benefits;

  return (
    <div className="sm-info-container">
      {/* მთავარი სათაური */}
      <div className="sm-info-hero">
        <h1 className="sm-info-main-title">
          {t("auth.salesManagerInfo.mainTitle")}
        </h1>
        <p className="sm-info-main-description">
          {t("auth.salesManagerInfo.mainDescription")}
        </p>
      </div>

      {/* როგორ მუშაობს */}
      <div className="sm-info-section">
        <h2 className="sm-info-section-title">
          {t("auth.salesManagerInfo.howItWorksTitle")}
        </h2>
        <div className="sm-info-steps">
          {Array.isArray(howItWorksSteps) && howItWorksSteps.map((step, index) => (
            <div key={index} className="sm-info-step">
              <div className="sm-info-step-number">{index + 1}</div>
              <p className="sm-info-step-text">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* შემოსავალი */}
      <div className="sm-info-section sm-info-earnings">
        <h2 className="sm-info-section-title">
          {t("auth.salesManagerInfo.earningsTitle")}
        </h2>
        <p className="sm-info-earnings-description">
          {t("auth.salesManagerInfo.earningsDescription")}
        </p>
        <div className="sm-info-earnings-highlight">
          <span className="sm-info-percentage">3%</span>
          <span className="sm-info-percentage-label">{t("auth.salesManagerInfo.commissionLabel")}</span>
        </div>
      </div>

      {/* რას მიიღებთ */}
      <div className="sm-info-section">
        <h2 className="sm-info-section-title">
          {t("auth.salesManagerInfo.benefitsTitle")}
        </h2>
        <ul className="sm-info-benefits-list">
          {Array.isArray(benefits) && benefits.map((benefit, index) => (
            <li key={index} className="sm-info-benefit-item">
              <span className="sm-info-check-icon">✓</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {/* მისია */}
      <div className="sm-info-section sm-info-mission">
        <h2 className="sm-info-section-title">
          {t("auth.salesManagerInfo.missionTitle")}
        </h2>
        <p className="sm-info-mission-description">
          {t("auth.salesManagerInfo.missionDescription")}
        </p>
      </div>

      {/* ვიდეო */}
      <div className="sm-info-section sm-info-video">
        <h2 className="sm-info-section-title">
          {t("auth.salesManagerInfo.videoTitle")}
        </h2>
        <div className="sm-info-video-wrapper">
          <iframe
            src="https://www.youtube.com/embed/6obVRk6Laic"
            title="SoulArt Partner Program"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>

      {/* CTA */}
      <div className="sm-info-cta">
        <h2 className="sm-info-cta-title">
          {t("auth.salesManagerInfo.ctaTitle")}
        </h2>
        <p className="sm-info-cta-description">
          {t("auth.salesManagerInfo.ctaDescription")}
        </p>
      </div>
    </div>
  );
}
