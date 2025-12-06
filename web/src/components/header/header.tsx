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
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  // Check if current page is a bottom nav page
  const isBottomNavPage = () => {
    if (pathname === "/" || pathname === "/shop" || pathname === "/explore") {
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Hide header on explore page only on mobile (after all hooks)
  if (pathname === "/explore" && isMobile) {
    return null;
  }

  const toggleNav = () => {
    setIsNavOpen((prevState) => !prevState); // Toggle navigation visibility
  };

  const handleOrdersClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      router.push("/profile/orders");
    } else {
      router.push("/unauthorized-orders");
    }
  };

  const closeNav = () => {
    setIsNavOpen(false);
  };

  return (
    <>
      <div className="header-placeholder" />
      <header className={`header ${isNavOpen ? "mobile-nav-active" : ""}`}>
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
                src="/logo-white.png"
                alt="logo soulArt"
                width={200}
                height={50}
                sizes="(max-width: 480px) 160px, 200px"
                style={{
                  objectFit: "contain",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              />
            </Link>
          )}
        </div>
        <nav className="main-nav">
          <ul>
            <li>
              <Link
                href={
                  user?.role === "seller" && user?.artistSlug
                    ? `/@${user.artistSlug}`
                    : "/sellers-register"
                }
                onClick={closeNav}
              >
                {user?.role === "seller"
                  ? t("navigation.myPage")
                  : t("navigation.sellArtwork")}
              </Link>
            </li>
            <li className="shop-dropdown">
              <Link href="/shop?page=1" onClick={closeNav}>
                {t("navigation.shop")}
              </Link>
              <div className="shop-dropdown-menu">
                <Link href="/auction" onClick={closeNav}>
                  {t("navigation.auction")}
                </Link>
              </div>
            </li>
            {/* Mobile-only auction link */}
            <li className="mobile-only-nav">
              <Link href="/auction" onClick={closeNav}>
                {t("navigation.auction")}
              </Link>
            </li>
            <li>
              <a
                href="#"
                onClick={(e) => {
                  handleOrdersClick(e);
                  closeNav();
                }}
              >
                {t("navigation.myOrders")}
              </a>
            </li>
            {/* Mobile-only auth, language and cart */}
            <li className="mobile-only-nav">
              <UserMenu onNavigate={closeNav} />
            </li>
            <div className="flex">
              <li className="mobile-only-nav mobile-language">
                <LanguageSwitcher onNavigate={closeNav} />
              </li>
              <li className="mobile-only-nav mobile-cart">
                <CartIcon onNavigate={closeNav} />
              </li>
            </div>
          </ul>
        </nav>
        <div className="auth-cart desktop-only">
          <div className="language-switcher-container">
            <LanguageSwitcher onNavigate={closeNav} />
          </div>
          <UserMenu onNavigate={closeNav} />
          <CartIcon onNavigate={closeNav} />
        </div>

        {/* Mobile Navigation */}
        <div className="mobile-nav-btn" onClick={toggleNav}>
          <span className={`hamburger-icon ${isNavOpen ? "close" : ""}`}>
            {isNavOpen ? "×" : "☰"}
          </span>
        </div>
      </header>
    </>
  );
}
