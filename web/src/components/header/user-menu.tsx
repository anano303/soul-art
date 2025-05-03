"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import "./user-menu.css";
import { Role } from "@/types/role";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";

export default function UserMenu() {
  const { user, isLoading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Add state to store profile image URL
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Update profile image when user changes
  useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    } else {
      setProfileImage("/avatar.jpg");
    }

    // დავამატოთ ლოგი დებაგისთვის
    console.log("User profile updated:", user);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return <div className="loader"></div>;
  }

  if (!user) {
    return (
      <Link href="/login" className="button">
        <span className="icon">🎭 {t("navigation.login")}</span>
      </Link>
    );
  }

  return (
    <div className="dropdown" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="button"
        aria-label="Toggle user menu"
      >
        <div className="user-avatar">
          <Image
            src={profileImage || "/avatar.jpg"}
            alt={user.name}
            width={32}
            height={32}
            className="avatar-image"
          />
        </div>
        <span className="username">{user.name || t("navigation.profile")}</span>
        <span className="icon">▼</span>
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-label">{t("navigation.profile")}</div>
          <hr />
          <Link
            href="/profile"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            {t("navigation.profile")}
          </Link>
          <Link
            href="/profile/orders"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            {t("navigation.orders")}
          </Link>

          {(user.role === Role.Admin || user.role === Role.Seller) && (
            <>
              <hr />
              <div className="dropdown-label">{t("navigation.adminPanel")}</div>
              <Link
                href="/admin/products"
                className="dropdown-item"
                onClick={() => setIsOpen(false)}
              >
                {t("navigation.products")}
              </Link>
            </>
          )}

          {user.role === Role.Admin && (
            <>
              <Link
                href="/admin/users"
                className="dropdown-item"
                onClick={() => setIsOpen(false)}
              >
                {t("navigation.users")}
              </Link>
              <Link
                href="/admin/orders"
                className="dropdown-item"
                onClick={() => setIsOpen(false)}
              >
                {t("navigation.orders")}
              </Link>
            </>
          )}

          <hr />
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="dropdown-item logout-button"
          >
            {t("navigation.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
