"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import logo from "@/../../public/logo-white.png";
import { CartIcon } from "@/modules/cart/components/cart-icon";
import "./header.scss";
import UserMenu from "./user-menu";
import { useUser } from "@/modules/auth/hooks/use-user";
import { LanguageSwitcher } from "@/components/language-switcher/language-switcher";
import { useLanguage } from "@/hooks/LanguageContext";

export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { user } = useUser();
  const router = useRouter();
  const { t } = useLanguage();

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
          <Link href="/">
            <Image
              src={logo}
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
        </div>
        <nav className="main-nav">
          <ul>
            <li>
              <Link
                href={
                  user?.role === "seller"
                    ? "/admin/products"
                    : "/sellers-register"
                }
                onClick={closeNav}
              >
                {user?.role === "seller"
                  ? t("navigation.myArtworks")
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
