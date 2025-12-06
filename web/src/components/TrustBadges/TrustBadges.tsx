"use client";

import { Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import Image from "next/image";
import "./TrustBadges.css";

const TrustBadges = () => {
  const { t } = useLanguage();

  return (
    <div className="trust-badges-container">
      {/* Georgian ornament decorations */}
      <div className="ornament-corner ornament-top-left"></div>
      <div className="ornament-corner ornament-top-right"></div>
      <div className="ornament-corner ornament-bottom-left"></div>
      <div className="ornament-corner ornament-bottom-right"></div>

      <div className="trust-badges-grid">
        {/* Free Shipping */}
        <div className="trust-badge trust-badge-shipping">
          <div className="badge-ornament-border"></div>
          <div className="trust-badge-icon">
            <Truck size={32} strokeWidth={2.5} color="#28a745" />
          </div>
          <div className="trust-badge-content">
            <h3 className="trust-badge-title">
              {t("home.trustBadges.freeShipping")}
            </h3>
            <p className="trust-badge-description">
              {t("home.trustBadges.freeShippingDesc")}
            </p>
          </div>
          <div className="georgian-pattern pattern-1"></div>
        </div>

        {/* Quality Guarantee */}
        <div className="trust-badge trust-badge-quality">
          <div className="badge-ornament-border"></div>
          <div className="trust-badge-icon">
            <ShieldCheck size={32} strokeWidth={2.5} color="#007bff" />
          </div>
          <div className="trust-badge-content">
            <h3 className="trust-badge-title">
              {t("home.trustBadges.qualityGuarantee")}
            </h3>
            <p className="trust-badge-description">
              {t("home.trustBadges.qualityGuaranteeDesc")}
            </p>
          </div>
          <div className="georgian-pattern pattern-2"></div>
        </div>

        {/* Fast Refund */}
        <div className="trust-badge trust-badge-refund">
          <div className="badge-ornament-border"></div>
          <div className="trust-badge-icon">
            <RotateCcw size={32} strokeWidth={2.5} color="#ffc107" />
          </div>
          <div className="trust-badge-content">
            <h3 className="trust-badge-title">
              {t("home.trustBadges.fastRefund")}
            </h3>
            <p className="trust-badge-description">
              {t("home.trustBadges.fastRefundDesc")}
            </p>
          </div>
          <div className="georgian-pattern pattern-3"></div>
        </div>

        {/* Secure Payment with BOG Logo */}
        <div className="trust-badge trust-badge-payment">
          <div className="badge-ornament-border"></div>
          <div className="trust-badge-icon trust-badge-icon-bog">
            <Image
              src="/bog.webp"
              alt="BOG Payment"
              width={65}
              height={65}
              className="bog-payment-logo"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="trust-badge-content">
            <h3 className="trust-badge-title">
              {t("home.trustBadges.securePayment")}
            </h3>
            <p className="trust-badge-description">
              {t("home.trustBadges.securePaymentDesc")}
            </p>
          </div>
          <div className="georgian-pattern pattern-4"></div>
        </div>
      </div>
    </div>
  );
};

export default TrustBadges;
