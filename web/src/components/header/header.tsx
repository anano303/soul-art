"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "../../assets/Images/logo white.png";
import { CartIcon } from "@/modules/cart/components/cart-icon";
import "./header.scss";
import UserMenu from "./user-menu";
import { useUser } from "@/modules/auth/hooks/use-user";

export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { user } = useUser();

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
            <Link href={user?.role === "seller" ? "/admin/products?seller=true" : "/sellers-register"}>
              {user?.role === "seller" ? "ჩემი ნახატები" : "გაყიდე ნახატები"}
            </Link>
          </li>
          <li>
            <Link href="/shop">შეიძინე ნახატები</Link>
          </li>
          <li>
            <Link href="/profile/orders">ჩემი შეკვეთები</Link>
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
