"use client";

import { useState } from "react";
import Link from "next/link";

import { useLanguage } from "@/hooks/LanguageContext";
import "./referral-info.css";

export default function ReferralInfoPage() {
  const { t } = useLanguage();
  const [copySuccess, setCopySuccess] = useState(false);

  const shareReferralInfo = async () => {
    const shareText = `${t("referral.shareText")}

${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t("referral.pageTitle"),
          text: shareText,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback - copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.log("Failed to copy text:", err);
      }
    }
  };

  return (
    <div className="referral-info-container">
      <div className="referral-info-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">{t("referral.title")}</h1>
            <p className="hero-subtitle">{t("referral.subtitle")}</p>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-amount">5 ₾</div>
                <div className="stat-label">{t("referral.sellerBonus")}</div>
              </div>
              <div className="stat-item">
                <div className="stat-amount">0.20 ₾</div>
                <div className="stat-label">{t("referral.userBonus")}</div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="how-it-works">
          <h2 className="section-title">{t("referral.howItWorks")}</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">
                {t("referral.steps.register.title")}
              </h3>
              <p className="step-description">
                {t("referral.steps.register.description")}
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">{t("referral.steps.invite.title")}</h3>
              <p className="step-description">
                {t("referral.steps.invite.description")}
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">
                {t("referral.steps.receive.title")}
              </h3>
              <p className="step-description">
                {t("referral.steps.receive.description")}
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h3 className="step-title">
                {t("referral.steps.withdraw.title")}
              </h3>
              <p className="step-description">
                {t("referral.steps.withdraw.description")}
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="benefits-section">
          <h2 className="section-title">{t("referral.whyUs.title")}</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">🎨</div>
              <h3 className="benefit-title">
                {t("referral.whyUs.benefits.art.title")}
              </h3>
              <p className="benefit-description">
                {t("referral.whyUs.benefits.art.description")}
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h3 className="benefit-title">
                {t("referral.whyUs.benefits.earnings.title")}
              </h3>
              <p className="benefit-description">
                {t("referral.whyUs.benefits.earnings.description")}
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">👥</div>
              <h3 className="benefit-title">
                {t("referral.whyUs.benefits.community.title")}
              </h3>
              <p className="benefit-description">
                {t("referral.whyUs.benefits.community.description")}
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🚀</div>
              <h3 className="benefit-title">
                {t("referral.whyUs.benefits.easy.title")}
              </h3>
              <p className="benefit-description">
                {t("referral.whyUs.benefits.easy.description")}
              </p>
            </div>
          </div>
        </section>

        {/* Earnings potential */}
        <section className="earnings-section">
          <h2 className="section-title">{t("referral.earnings.title")}</h2>
          <div className="earnings-calculator">
            <div className="calculator-card">
              <h3>{t("referral.earnings.ifInvite")}</h3>
              <div className="calculation-row">
                <span>10 {t("referral.earnings.sellers")}</span>
                <span className="arrow">→</span>
                <span className="earning">50 ₾</span>
              </div>
              <div className="calculation-row">
                <span>20 {t("referral.earnings.sellers")}</span>
                <span className="arrow">→</span>
                <span className="earning">100 ₾</span>
              </div>
              <div className="calculation-row">
                <span>50 {t("referral.earnings.sellers")}</span>
                <span className="arrow">→</span>
                <span className="earning">250 ₾</span>
              </div>
              <p className="calculator-note">{t("referral.earnings.note")}</p>
            </div>
          </div>
        </section>

        {/* Rules */}
        <section className="rules-section">
          <h2 className="section-title">{t("referral.rules.title")}</h2>
          <div className="rules-grid">
            <div className="rule-card">
              <h4>{t("referral.rules.seller.title")}</h4>
              <ul>
                <li>{t("referral.rules.seller.items.0")}</li>
                <li>{t("referral.rules.seller.items.1")}</li>
                <li>{t("referral.rules.seller.items.2")}</li>
              </ul>
            </div>
            <div className="rule-card">
              <h4>{t("referral.rules.regular.title")}</h4>
              <ul>
                <li>{t("referral.rules.regular.items.0")}</li>
                <li>{t("referral.rules.regular.items.1")}</li>
              </ul>
            </div>
            <div className="rule-card">
              <h4>{t("referral.rules.withdrawal.title")}</h4>
              <ul>
                <li>{t("referral.rules.withdrawal.items.0")}</li>
                <li>{t("referral.rules.withdrawal.items.1")}</li>
                <li>{t("referral.rules.withdrawal.items.2")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">{t("referral.cta.title")}</h2>
            <p className="cta-description">{t("referral.cta.description")}</p>
            <div className="cta-buttons">
              <Link
                href="/sellers-register#seller-register-form"
                className="btn btn-primary"
              >
                {t("referral.cta.sellerRegister")}
              </Link>
              <Link href="/register" className="btn btn-secondary">
                {t("referral.cta.regularRegister")}
              </Link>
            </div>
            <div className="share-section">
              <p>{t("referral.cta.share")}</p>
              <button onClick={shareReferralInfo} className="btn btn-share">
                {copySuccess
                  ? t("referral.cta.copied")
                  : t("referral.cta.shareButton")}
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq-section">
          <h2 className="section-title">{t("referral.faq.title")}</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>{t("referral.faq.items.whenBonus.question")}</h4>
              <p>{t("referral.faq.items.whenBonus.answer")}</p>
            </div>
            <div className="faq-item">
              <h4>{t("referral.faq.items.selfRegister.question")}</h4>
              <p>{t("referral.faq.items.selfRegister.answer")}</p>
            </div>
            <div className="faq-item">
              <h4>{t("referral.faq.items.withdrawMethods.question")}</h4>
              <p>{t("referral.faq.items.withdrawMethods.answer")}</p>
            </div>
            <div className="faq-item">
              <h4>{t("referral.faq.items.referralLimit.question")}</h4>
              <p>{t("referral.faq.items.referralLimit.answer")}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
