"use client";

import {
  Users,
  Package,
  Star,
  TrendingUp,
  Truck,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import bogLogo from "../../../public/bog.webp";
import { useLanguage } from "@/hooks/LanguageContext";
import "./SocialProof.css";

const SocialProof = () => {
  const { language, t } = useLanguage();

  const stats = [
    {
      icon: Users,
      value: "500+",
      label: language === "ge" ? "მხატვარი" : "Artists",
      color: "#007bff",
    },
    {
      icon: Package,
      value: "2,000+",
      label: language === "ge" ? "ნამუშევარი" : "Artworks",
      color: "#28a745",
    },
    {
      icon: Star,
      value: "4.8/5",
      label: language === "ge" ? "შეფასება" : "Rating",
      color: "#ffc107",
    },
    {
      icon: TrendingUp,
      value: "95%",
      label: language === "ge" ? "კმაყოფილება" : "Satisfaction",
      color: "#6f42c1",
    },
  ];

  // Trust badges between stats
  const trustBadges = [
    {
      id: "shipping",
      icon: Truck,
      title: t("home.trustBadges.freeShipping"),
      description: t("home.trustBadges.freeShippingDesc"),
      color: "#28a745",
    },
    {
      id: "quality",
      icon: ShieldCheck,
      title: t("home.trustBadges.qualityGuarantee"),
      description: t("home.trustBadges.qualityGuaranteeDesc"),
      color: "#007bff",
    },
    {
      id: "refund",
      icon: RotateCcw,
      title: t("home.trustBadges.fastRefund"),
      description: t("home.trustBadges.fastRefundDesc"),
      color: "#ec9843",
    },
    {
      id: "payment",
      icon: null,
      isBogLogo: true,
      title: t("home.trustBadges.securePayment"),
      description: t("home.trustBadges.securePaymentDesc"),
      color: "#452001",
    },
  ];

  return (
    <div className="social-proof-container">
      <div className="social-proof-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="social-proof-stat">
              <div
                className="stat-icon"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <Icon
                  size={28}
                  strokeWidth={2.5}
                  style={{ color: stat.color }}
                />
              </div>
              <div className="stat-content">
                <div className="stat-value" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Badges Section */}
      <div className="trust-badges-section">
        {trustBadges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.id}
              className={`trust-badge-item trust-badge-${badge.id}`}
            >
              <div className="trust-badge-icon" style={{ color: badge.color }}>
                {badge.isBogLogo ? (
                  <Image
                    src={bogLogo}
                    alt="BOG Payment"
                    width={48}
                    height={48}
                    className="bog-logo-badge"
                  />
                ) : Icon ? (
                  <Icon size={32} strokeWidth={2.5} />
                ) : null}
              </div>
              <div className="trust-badge-content">
                <h4>{badge.title}</h4>
                <p>{badge.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SocialProof;
