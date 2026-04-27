"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./footer.css";
import { useLanguage } from "@/hooks/LanguageContext";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { SellerContract } from "@/components/SellerContract";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import { DonationModal } from "@/components/donation/DonationModal";

export default function Footer() {
  const { t, language } = useLanguage();
  const [showTerms, setShowTerms] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showInstallmentInfo, setShowInstallmentInfo] = useState(false);

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
            <li>
              <Link href="/faq" className="footer-link">
                {language === "en" ? "FAQ" : "ხშირად დასმული კითხვები"}
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
            <button
              onClick={() => setShowInstallmentInfo(true)}
              className="footer-link-small"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", color: "inherit", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <Image src="/dayavi.webp" alt="" width={66} height={22} style={{ height: "22px", width: "auto", objectFit: "contain" }} />
              {language === "en" ? "Installment Terms" : "განვადების პირობები"}
            </button>
            <span className="footer-legal-divider">·</span>
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

      {/* Installment Terms Modal */}
      {showInstallmentInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
          onClick={() => setShowInstallmentInfo(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              maxWidth: "560px",
              width: "90%",
              maxHeight: "85vh",
              overflow: "auto",
              padding: "32px",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInstallmentInfo(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#6b7280",
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <Image
                src="/dayavi.webp"
                alt="კრედო და-ყა-ვი"
                width={120}
                height={40}
                style={{ height: "40px", width: "auto", objectFit: "contain" }}
              />
              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                {language === "en" ? "Installment Terms" : "განვადების პირობები"}
              </h2>
            </div>

            {/* Interest-free badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "24px",
              backgroundColor: "#ecfdf5",
              border: "1px solid #a7f3d0",
              marginBottom: "20px",
            }}>
              <span style={{ fontSize: "20px" }}>✨</span>
              <span style={{ fontWeight: 700, color: "#059669", fontSize: "16px" }}>
                {language === "en" ? "Split into 3-4 months – Interest Free!" : "დაყავი 3-4 თვემდე – სრულიად უპროცენტოდ!"}
              </span>
            </div>

            <div style={{ color: "#374151", lineHeight: 1.7, fontSize: "15px" }}>
              {language === "en" ? (
                <>
                  <p style={{ marginBottom: "14px" }}>
                    SoulArt offers <strong>interest-free installment</strong> through <strong>Credo Bank</strong>.
                    Purchase art and handmade products with convenient monthly payments at 0% interest.
                  </p>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "10px" }}>How it works:</h3>
                  <ol style={{ paddingLeft: "20px", marginBottom: "14px" }}>
                    <li style={{ marginBottom: "8px" }}>Choose <strong>&quot;Credo Installment&quot;</strong> as your payment method at checkout</li>
                    <li style={{ marginBottom: "8px" }}>Fill out the installment application on Credo Bank&apos;s website</li>
                    <li style={{ marginBottom: "8px" }}>Wait for approval (usually within 1-3 business days)</li>
                    <li style={{ marginBottom: "8px" }}>Once approved, sign the contract digitally</li>
                    <li>Your order ships after the contract is signed</li>
                  </ol>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "10px" }}>Conditions:</h3>
                  <ul style={{ paddingLeft: "20px", marginBottom: "14px" }}>
                    <li style={{ marginBottom: "6px" }}>Amount: <strong>100₾ – 12,500₾</strong></li>
                    <li style={{ marginBottom: "6px" }}>Interest-free period: <strong>3-4 months at 0%</strong></li>
                    <li style={{ marginBottom: "6px" }}>Longer terms available (with interest)</li>
                    <li style={{ marginBottom: "6px" }}>If the product costs more than 12,500₾, the bank covers up to 12,500₾ and you pay the rest</li>
                    <li style={{ marginBottom: "6px" }}>Provided by: <strong>Credo Bank</strong></li>
                    <li style={{ marginBottom: "6px" }}>Must be a resident of Georgia with a valid ID</li>
                    <li>Stock is reserved while your application is being reviewed</li>
                  </ul>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: "14px" }}>
                    SoulArt გთავაზობთ <strong>უპროცენტო განვადებას</strong> <strong>კრედო ბანკის</strong> მეშვეობით.
                    შეიძინეთ ხელოვნება და ხელნაკეთი ნივთები მოსახერხებელი თვიური გადახდებით, 0%-ით.
                  </p>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "10px" }}>როგორ მუშაობს:</h3>
                  <ol style={{ paddingLeft: "20px", marginBottom: "14px" }}>
                    <li style={{ marginBottom: "8px" }}>Checkout-ში აირჩიეთ <strong>&quot;კრედო განვადება&quot;</strong></li>
                    <li style={{ marginBottom: "8px" }}>შეავსეთ განაცხადი კრედო ბანკის ვებ-გვერდზე</li>
                    <li style={{ marginBottom: "8px" }}>დაელოდეთ დამტკიცებას (ჩვეულებრივ 1-3 სამუშაო დღე)</li>
                    <li style={{ marginBottom: "8px" }}>დამტკიცების შემდეგ ხელი მოაწერეთ ხელშეკრულებას ციფრულად</li>
                    <li>ხელშეკრულების ხელმოწერის შემდეგ თქვენი შეკვეთა იგზავნება</li>
                  </ol>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "10px" }}>პირობები:</h3>
                  <ul style={{ paddingLeft: "20px", marginBottom: "14px" }}>
                    <li style={{ marginBottom: "6px" }}>თანხა: <strong>100₾ – 12,500₾</strong></li>
                    <li style={{ marginBottom: "6px" }}>უპროცენტო ვადა: <strong>3-4 თვემდე 0%-ით</strong></li>
                    <li style={{ marginBottom: "6px" }}>უფრო გრძელი ვადაც შესაძლებელია (პროცენტით)</li>
                    <li style={{ marginBottom: "6px" }}>თუ პროდუქტი 12,500₾-ზე მეტი ღირს, ბანკი ფარავს 12,500₾-მდე, დანარჩენს თქვენ იხდით</li>
                    <li style={{ marginBottom: "6px" }}>უზრუნველყოფს: <strong>კრედო ბანკი</strong></li>
                    <li style={{ marginBottom: "6px" }}>საქართველოს რეზიდენტი, მოქმედი პირადობით</li>
                    <li>მარაგი დარეზერვებულია განაცხადის განხილვის პერიოდში</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
