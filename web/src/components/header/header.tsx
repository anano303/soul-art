"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CartIcon } from "@/modules/cart/components/cart-icon";
import "./header.scss";
import UserMenu from "./user-menu";
import { useUser } from "@/modules/auth/hooks/use-user";
import { LanguageSwitcher } from "@/components/language-switcher/language-switcher";
import { useLanguage } from "@/hooks/LanguageContext";

export default function Header() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [headerOpacity, setHeaderOpacity] = useState(1);
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  // Check if current page is a bottom nav page
  const isBottomNavPage = () => {
    if (
      pathname === "/" ||
      pathname === "/shop" ||
      pathname === "/explore" ||
      pathname === "/auction" ||
      pathname.startsWith("/profile/orders") ||
      pathname.startsWith("/sellers-register")
    ) {
      return true;
    }
    // Check if on user's own profile page (artist page with @slug)
    if (user) {
      // For sellers with artist pages using @slug format
      if ((user.role === "seller" || user.isSeller) && user.artistSlug) {
        const artistPath = `/@${user.artistSlug}`;
        if (pathname === artistPath) {
          return true;
        }
      }
    }
    return false;
  };

  const showBackButton = isMobile && !isBottomNavPage();

  // Check if current page is an artist portfolio page
  const isArtistPortfolioPage = pathname?.startsWith("/@");

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Scroll-based header opacity for artist portfolio pages on mobile
  // Opacity linearly interpolates from 0 (at scroll 0) to 1 (at scroll >= threshold)
  useEffect(() => {
    if (!isMobile || !isArtistPortfolioPage) {
      setHeaderOpacity(1);
      return;
    }

    const SCROLL_THRESHOLD = 200; // Fully opaque at 200px scroll

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Calculate opacity linearly: 0 at top, 1 at threshold
      const opacity = Math.min(currentScrollY / SCROLL_THRESHOLD, 1);
      setHeaderOpacity(opacity);
    };

    // Initial state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile, isArtistPortfolioPage]);

  // Hide header on explore page only on mobile (after all hooks)
  if (pathname === "/explore" && isMobile) {
    return null;
  }

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  const closeUserMenu = () => {
    setIsUserMenuOpen(false);
  };

  // Check if header should use dynamic opacity (artist portfolio on mobile)
  const useTransparentHeader = isMobile && isArtistPortfolioPage;

  return (
    <>
      <div
        className={`header-placeholder ${
          useTransparentHeader ? "header-placeholder--transparent" : ""
        }`}
      />
      <header
        className={`header ${
          useTransparentHeader ? "header--transparent" : ""
        }`}
        style={
          useTransparentHeader
            ? { backgroundColor: `rgba(1, 38, 69, ${headerOpacity})` }
            : undefined
        }
      >
        <div className="logo">
          {showBackButton ? (
            <button
              onClick={() => router.back()}
              className="header-back-button"
              aria-label="Go back"
            >
              <ArrowLeft size={24} />
            </button>
          ) : (
            <Link href="/">
              <Image
                src="/logo-white.webp"
                alt="logo soulArt"
                width={200}
                height={50}
                sizes="(max-width: 768px) 120px, 200px"
                priority
                style={{
                  objectFit: "contain",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              />
            </Link>
          )}
        </div>

        {/* Centered logo when back button is visible (mobile) */}
        {showBackButton && (
          <Link
            href="/"
            className="header-center-logo"
            style={
              useTransparentHeader ? { opacity: headerOpacity } : undefined
            }
          >
            <Image
              src="/logo-white-text.webp"
              alt="soulArt"
              width={160}
              height={40}
              style={{
                objectFit: "contain",
              }}
            />
          </Link>
        )}
        <nav className="main-nav desktop-only">
          <ul>
            <li>
              <Link
                href={
                  user?.role === "seller" && user?.artistSlug
                    ? `/@${user.artistSlug}`
                    : "/sellers-register"
                }
              >
                {user?.role === "seller"
                  ? t("navigation.myPage")
                  : t("navigation.sellArtwork")}
              </Link>
            </li>
            <li className="shop-dropdown">
              <Link href="/shop?page=1">{t("navigation.shop")}</Link>
              <div className="shop-dropdown-menu">
                <Link href="/auction">{t("navigation.auction")}</Link>
              </div>
            </li>
            <li>
              <Link href="/auction">{t("navigation.auction")}</Link>
            </li>
          </ul>
        </nav>
        <div className="auth-cart desktop-only">
          <div className="language-switcher-container">
            <LanguageSwitcher />
          </div>
          <UserMenu />
          <CartIcon />
        </div>

        {/* Mobile: Only hamburger menu - visibility controlled by CSS */}
        <div className="mobile-header-actions">
          <button
            className="mobile-nav-btn"
            onClick={toggleUserMenu}
            aria-label={isUserMenuOpen ? "Close user menu" : "Open user menu"}
            aria-expanded={isUserMenuOpen}
          >
            <span className="hamburger-icon" aria-hidden="true">
              ☰
            </span>
          </button>
        </div>

        {/* Mobile UserMenu - controlled externally */}
        {isMobile && (
          <UserMenu
            onNavigate={closeUserMenu}
            isOpenExternal={isUserMenuOpen}
            onCloseExternal={closeUserMenu}
            hideButton={true}
          />
        )}
      </header>
    </>
  );
}
