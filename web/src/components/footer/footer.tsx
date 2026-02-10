"use client";

import React, { useState } from "react";
import "./footer.css";
import { useLanguage } from "@/hooks/LanguageContext";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { SellerContract } from "@/components/SellerContract";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import { DonationModal } from "@/components/donation/DonationModal";

export default function Footer() {
  const { t } = useLanguage();
  const [showTerms, setShowTerms] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDonation, setShowDonation] = useState(false);

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
              <a href="/blog" className="footer-link">
                {t("navigation.blog")}
              </a>
            </li>
            <li>
              <a href="/auction" className="footer-link">
                {t("navigation.auction")}
              </a>
            </li>
            <li>
              <a href="/sales-manager-register" className="footer-link">
                {t("footer.referralInfo")}
              </a>
            </li>
            <li>
              <a href="/careers" className="footer-link">
                {t("footer.careers")}
              </a>
            </li>
            <li>
             <Link href="/privacy-policy" className="footer-link">
                {t("footer.privacyPolicy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="footer-link">
                {t("footer.termsAndConditions")}
              </Link>
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

          {/* Sponsor/Donation Button */}
          <button
            onClick={() => setShowDonation(true)}
            className="sponsor-button"
          >
            <span className="sponsor-heart">❤️</span>
            {t("donation.becomeSponsor")}
          </button>
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

      <DonationModal
        isOpen={showDonation}
        onClose={() => setShowDonation(false)}
      />
    </footer>
  );
}
