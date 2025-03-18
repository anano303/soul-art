"use client";

import React, { useContext, useState } from "react";
import { LanguageContext } from "../../hooks/LanguageContext";
import Image from "next/image";
import geoFlag from "../../assets/geoFlag.png";
import engFlag from "../../assets/engFlag.png";
import Link from "next/link";
import logo from "../../assets/logo.png";
import SearchBox from "../SearchBox/search-box";
import { CartIcon } from "@/modules/cart/components/cart-icon";
import UserMenu from "./user-menu";
import "./header.css";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useContext(LanguageContext); // ენის კონტროლი

  const handleLangClick = () => {
    const newLanguage = language === "ge" ? "en" : "ge"; // ენების გადართვა
    setLanguage(newLanguage); // ახალი ენის დაყენება
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="left-section">
            <button className="menu-button" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? "✖" : "☰"}
            </button>
            <Link href="/" className="logo">
              Fish
              <Image className="logoImage" src={logo} alt="" />
              Hunt
            </Link>
          </div>

          <div className="search-box">
            <SearchBox />
          </div>

          <nav className="nav-menu">
            <CartIcon />
            <UserMenu />
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="mobile-menu">
          <div className="container">
            <div className="mobile-menu-content">
              <SearchBox />
              <div className="menu-icons">
                <div className="header__actions">
                  <Image
                    src={language === "ge" ? engFlag : geoFlag}
                    alt={language === "ge" ? "English Flag" : "Georgian Flag"}
                    width={35}
                    height={25}
                    onClick={handleLangClick}
                    className="header__lang"
                  />
                </div>
                <CartIcon />
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
