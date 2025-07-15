"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import logo from "../../assets/Images/logo white.png";
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

  return (
    <header className={`header ${isNavOpen ? "mobile-nav-active" : ""}`}>
      <div className="logo">
        <Link href="/">
          <Image
            src={logo}
            width={200}
            style={{ height: "auto" }}
            alt="logo soulArt"
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
            >
              {user?.role === "seller"
                ? t("navigation.myArtworks")
                : t("navigation.sellArtwork")}
            </Link>
          </li>
          <li className="shop-dropdown">
            <Link href="/shop?page=1">{t("navigation.shop")}</Link>
            <div className="dropdown-menu">
              <Link href="/auction">{t("navigation.auction")}</Link>
            </div>
          </li>
          {/* Mobile-only auction link */}
          <li className="mobile-only-nav">
            <Link href="/auction">{t("navigation.auction")}</Link>
          </li>
          <li>
            <a href="#" onClick={handleOrdersClick}>
              {t("navigation.myOrders")}
            </a>
          </li>
          {/* Mobile-only auth, language and cart */}
          <li className="mobile-only-nav">
            <UserMenu />
          </li>
          <div className="flex">
            <li className="mobile-only-nav mobile-language">
              <LanguageSwitcher />
            </li>
            <li className="mobile-only-nav mobile-cart">
              <CartIcon />
            </li>
          </div>
        </ul>
      </nav>
      <div className="auth-cart desktop-only">
        <div className="language-switcher-container">
          <LanguageSwitcher />
        </div>
        <UserMenu />
        <CartIcon />
      </div>

      {/* Mobile Navigation */}
      <div className="mobile-nav-btn" onClick={toggleNav}>
        <span className={`hamburger-icon ${isNavOpen ? "close" : ""}`}>
          {isNavOpen ? "×" : "☰"}
        </span>
      </div>
    </header>
  );
}
