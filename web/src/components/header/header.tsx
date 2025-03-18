"use client";

import React, { useState } from "react";
// import { LanguageContext } from "../../hooks/LanguageContext";
import Image from "next/image";
// import geoFlag from "../../assets/geoFlag.png";
// import engFlag from "../../assets/engFlag.png";
import Link from "next/link";
import logo from "../../assets/Images/logo white.png";

import { CartIcon } from "@/modules/cart/components/cart-icon";
import "./header.scss";
import UserMenu from "./user-menu";

export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  // const { language, setLanguage } = useContext(LanguageContext); // ენის კონტროლი

  // const handleLangClick = () => {
  //   const newLanguage = language === "ge" ? "en" : "ge"; // ენების გადართვა
  //   setLanguage(newLanguage); // ახალი ენის დაყენება
  // };
  const toggleNav = () => {
    setIsNavOpen((prevState) => !prevState); // Toggle navigation visibility
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
            <Link href="/artists">გაყიდე ნახატები</Link>
          </li>
          <li>
            <Link href="/artworks">შეიძინე ნახატები</Link>
          </li>
          <li>
            <Link href="/contact">ჩემი შეკვეთები</Link>
          </li>
          <li className="mobileAuth">
            <UserMenu />
          </li>
        </ul>
      </nav>
      <div className="auth-cart">
        <div className="d-none">
          <UserMenu />
        </div>

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
