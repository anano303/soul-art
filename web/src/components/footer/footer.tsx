"use client";

import React from "react";
import "./footer.css";
import { useLanguage } from "@/hooks/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

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
              <a href="/privacy-policy" className="footer-link">
                {t("footer.privacyPolicy")}
              </a>
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
    </footer>
  );
}
