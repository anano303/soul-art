"use client";

import React, { useState } from "react";
import Link from "next/link";
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

        {/* Navigation links */}
        <div className="footer-section">
          <h4 className="footer-subtitle">{t("footer.navigation")}</h4>
          <ul className="footer-links">
            <li>
              <Link href="/about" className="footer-link">
                {t("navigation.about")}
              </Link>
            </li>
            <li>
              <Link href="/shop" className="footer-link">
                {t("navigation.shop")}
              </Link>
            </li>
            <li>
              <Link href="/auctions" className="footer-link">
                {t("navigation.auction")}
              </Link>
            </li>
            <li>
              <Link href="/blog" className="footer-link">
                {t("navigation.blog")}
              </Link>
            </li>
            <li>
              <Link href="/forum" className="footer-link">
                {t("navigation.forum")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="footer-link">
                {t("footer.contact")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Join us + Legal */}
        <div className="footer-section">
          <h4 className="footer-subtitle">{t("footer.joinUs")}</h4>
          <ul className="footer-links">
            <li>
              <Link href="/become-seller" className="footer-link footer-link-highlight">
                🎨 {t("footer.becomeSeller")}
                <span className="footer-link-sub">
                  {t("footer.becomeSellerSub")}
                </span>
              </Link>
            </li>
            <li>
              <Link href="/sales-manager-register" className="footer-link footer-link-highlight">
                🤝 {t("footer.referralInfo")}
                <span className="footer-link-sub">
                  {t("footer.referralSub")}
                </span>
              </Link>
            </li>
          </ul>

          <ul className="footer-links">
            <li>
              <Link href="/careers" className="footer-link">
                {t("footer.careers")}
              </Link>
            </li>
          </ul>

          <div className="footer-legal">
            <Link href="/privacy-policy" className="footer-link-small">
              {t("footer.privacyPolicy")}
            </Link>
            <span className="footer-legal-divider">·</span>
            <Link href="/terms" className="footer-link-small">
              {t("footer.termsAndConditions")}
            </Link>
          </div>
        </div>

        {/* Social + Donate */}
        <div className="footer-section">
          <h4 className="footer-subtitle">{t("footer.follow")}</h4>
          <div className="footer-socials">
            <a
              href="https://www.facebook.com/SoulArtge"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon facebook"
            >
              Facebook
            </a>
            <a
              href="https://www.instagram.com/soulart.ge"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon instagram"
            >
              Instagram
            </a>
            <a
              href="https://www.tiktok.com/@soulart.ge"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon tiktok"
            >
              TikTok
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
