"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import "./admin-dashboard.css";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const adminSections = [
    {
      title: t("admin.analytics"),
      href: "/admin/analytics",
      icon: "📊",
      description: t("admin.analyticsDesc"),
    },
    {
      title: t("admin.users"),
      href: "/admin/users",
      icon: "👥",
      description: t("admin.usersDesc"),
    },
    {
      title: t("admin.products"),
      href: "/admin/products",
      icon: "🎨",
      description: t("admin.productsDesc"),
    },
    {
      title: t("admin.auctions"),
      href: "/admin/auctions",
      icon: "🏆",
      description: t("admin.auctionsDesc"),
    },
    {
      title: t("admin.orders"),
      href: "/admin/orders",
      icon: "📦",
      description: t("admin.ordersDesc"),
    },
    {
      title: t("admin.categories"),
      href: "/admin/categories",
      icon: "📁",
      description: t("admin.categoriesDesc"),
    },
    {
      title: t("admin.banners"),
      href: "/admin/banners",
      icon: "🖼️",
      description: t("admin.bannersDesc"),
    },
    {
      title: t("admin.balances"),
      href: "/admin/balances",
      icon: "💰",
      description: t("admin.balancesDesc"),
    },
    {
      title: t("admin.referrals"),
      href: "/admin/referrals",
      icon: "🔗",
      description: t("admin.referralsDesc"),
    },
    {
      title: t("admin.settings"),
      href: "/admin/settings",
      icon: "⚙️",
      description: t("admin.settingsDesc"),
    },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1 className="admin-title">
          {t("admin.welcome")}, {user?.ownerFirstName || user?.firstName}!
        </h1>
        <p className="admin-subtitle">{t("admin.subtitle")}</p>
      </div>

      <div className="admin-grid">
        {adminSections.map((section, index) => (
          <Link key={index} href={section.href} className="admin-card">
            <div className="admin-card-icon">{section.icon}</div>
            <div className="admin-card-content">
              <h3 className="admin-card-title">{section.title}</h3>
              <p className="admin-card-description">{section.description}</p>
            </div>
            <div className="admin-card-arrow">→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
