"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import "./user-menu.css";
import { Role } from "@/types/role";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";

// Add a style object for the FiraGo font
const userMenuStyles = {
  fontFamily: '"FiraGo", sans-serif',
};

export default function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isLoading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Add state to store profile image URL
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleLinkClick = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  // Check if URL is from Cloudinary
  const isCloudinaryUrl = (url: string): boolean => {
    return url.includes("cloudinary.com");
  };

  // Update profile image when user changes
  useEffect(() => {
    if (user?.profileImage) {
      // For Cloudinary images, we can use them directly without validation
      if (isCloudinaryUrl(user.profileImage)) {
        console.log(
          "Using Cloudinary profile image directly:",
          user.profileImage
        );
        setProfileImage(user.profileImage);
      } else {
        // For other sources like S3, set immediately but validate in the background
        setProfileImage(user.profileImage);
      }
    } else {
      setProfileImage("/avatar.jpg");
    }

    // Disable profile logging entirely
    // if (process.env.NODE_ENV === 'development' && user) {
    //   console.log("User profile updated:", user);
    // }
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
      <Link href="/login" className="button" onClick={handleLinkClick}>
        🎭
        <span className="icon"> {t("navigation.login")}</span>
      </Link>
    );
  }

  return (
    <div className="user-menu-container" style={userMenuStyles}>
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
              style={{ width: "32px", height: "32px", objectFit: "cover" }}
              className="avatar-image"
              loading="eager"
              unoptimized
              key={`avatar-${
                user?.profileImage ? "profile" : "default"
              }-${new Date().getTime()}`}
              onError={(e) => {
                console.warn("Failed to load profile image, retrying...");

                // Function to clean S3 URLs
                const cleanS3Url = (url: string): string => {
                  if (url.includes("amazonaws.com") && url.includes("?")) {
                    return url.split("?")[0];
                  }
                  return url;
                };

                // Add retry logic
                setTimeout(() => {
                  const imgElement = e.currentTarget as HTMLImageElement;

                  // If it's an AWS S3 URL, try with a cleaned version
                  if (
                    user?.profileImage &&
                    user.profileImage.includes("amazonaws.com")
                  ) {
                    const cleanedUrl = cleanS3Url(user.profileImage);
                    const newSrc = `${cleanedUrl}?retry=${new Date().getTime()}`;
                    imgElement.src = newSrc;
                  } else if (user?.profileImage) {
                    // Otherwise add regular cache busting
                    const newSrc = `${user.profileImage}${
                      user.profileImage.includes("?") ? "&" : "?"
                    }retry=${new Date().getTime()}`;
                    imgElement.src = newSrc;
                  } else {
                    setProfileImage("/avatar.jpg");
                  }
                }, 500);
              }}
            />
          </div>
          <span className="username">
            {user.name || t("navigation.profile")}
          </span>
          <span className="icon">▼</span>
        </button>
        {isOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-label">{t("navigation.profile")}</div>
            <hr />
            <Link
              href="/profile"
              className="dropdown-item"
              onClick={handleLinkClick}
            >
              {t("navigation.profile")}
            </Link>
            <Link
              href="/profile/orders"
              className="dropdown-item"
              onClick={handleLinkClick}
            >
              {t("navigation.orders")}
            </Link>

            {/* რეფერალების ლინკი ყველა ავტორიზებული მომხმარებლისთვის */}
            <Link
              href="/referrals"
              className="dropdown-item"
              onClick={handleLinkClick}
            >
              {t("navigation.referrals")}
            </Link>

            {(user.role === Role.Admin || user.role === Role.Seller) && (
              <>
                <hr />
                <div className="dropdown-label">
                  {t("navigation.adminPanel")}
                </div>
                <Link
                  href="/admin/products"
                  className="dropdown-item"
                  onClick={handleLinkClick}
                >
                  {t("navigation.products")}
                </Link>
              </>
            )}
            {user.role === Role.Admin && (
              <>
                <Link
                  href="/admin/banners"
                  className="dropdown-item"
                  onClick={handleLinkClick}
                >
                  {t("navigation.banners")}
                </Link>
                <Link
                  href="/admin/referrals"
                  className="dropdown-item"
                  onClick={handleLinkClick}
                >
                  {t("navigation.adminReferrals")}
                </Link>
              </>
            )}

            {user.role === Role.Admin && (
              <>
                <Link
                  href="/admin/categories"
                  className="dropdown-item"
                  onClick={handleLinkClick}
                >
                  {t("navigation.categories")}
                </Link>
                <Link
                  href="/admin/users"
                  className="dropdown-item"
                  onClick={handleLinkClick}
                >
                  {t("navigation.users")}
                </Link>
              </>
            )}

            {(user.role === Role.Admin || user.role === Role.Seller) && (
              <Link
                href="/admin/orders"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                {t("navigation.orders")}
              </Link>
            )}

            {/* Balance links */}
            {user.role === Role.Admin && (
              <Link
                href="/admin/balances"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                {t("navigation.balances")}
              </Link>
            )}

            {user.role === Role.Seller && (
              <Link
                href="/profile/balance"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                {t("navigation.myBalance")}
              </Link>
            )}

            <hr />
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigate?.();
                logout();
              }}
              className="dropdown-item logout-button"
            >
              {t("navigation.logout")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
