"use client";

import React, { useState } from "react";
import "./footer.css";
import { useLanguage } from "@/hooks/LanguageContext";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { SellerContract } from "@/components/SellerContract";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";

export default function Footer() {
  const { t } = useLanguage();
  const [showTerms, setShowTerms] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">SoulArt</h3>
          <p className="footer-description">{t("footer.description")}</p>
        </div>
        <div className="footer-section">
          <h4 className="footer-subtitle">{t("footer.quickLinks")}</h4>
          <ul className="footer-links">
            <li>
              <a href="/about" className="footer-link">
                {t("navigation.about")}
              </a>
            </li>
            <li>
              <a href="/contact" className="footer-link">
                {t("footer.contact")}
              </a>
            </li>
            <li>
              <a href="/shop" className="footer-link">
                {t("navigation.shop")}
              </a>
            </li>
            <li>
              <a href="/forum" className="footer-link">
                {t("navigation.forum")}
              </a>
            </li>
            <li>
              <a href="/auction" className="footer-link">
                {t("navigation.auction")}
              </a>
            </li>
            <li>
              <a href="/referral-info" className="footer-link">
                რეფერალები - გამოიმუშავე ფული
              </a>
            </li>
            <li>
              <button
                onClick={() => setShowPrivacy(true)}
                className="footer-link"
                style={{
                  background: "none",
                  border: "none",
                  paddingLeft: 0,
                }}
              >
                {t("footer.privacyPolicy")}
              </button>
            </li>
            <li>
              <button
                onClick={() => setShowTerms(true)}
                className="footer-link"
                style={{
                  background: "none",
                  border: "none",
                  paddingLeft: 0,
                }}
              >
                {t("footer.termsAndConditions")}
              </button>
            </li>
          </ul>
        </div>
        <div className="footer-section">
          <h4 className="footer-subtitle">{t("footer.follow")}</h4>
          <div className="footer-socials">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon facebook"
            >
              Facebook
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon instagram"
            >
              Instagram
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon twitter"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
      </div>

      {/* Modals */}
      <TermsAndConditions
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        showAcceptButton={false}
      />

      <PrivacyPolicy
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        showAcceptButton={false}
      />

      <SellerContract
        isOpen={showContract}
        onClose={() => setShowContract(false)}
        showAcceptButton={false}
      />
    </footer>
  );
}
