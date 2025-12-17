"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import "./user-menu.css";
import { Role } from "@/types/role";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import { LanguageSwitcher } from "@/components/language-switcher/language-switcher";
import { CartIcon } from "@/modules/cart/components/cart-icon";
import {
  X,
  User,
  ShoppingBag,
  Users,
  Package,
  Tag,
  Settings,
  DollarSign,
  LogOut,
  Gift,
  BarChart3,
  Activity,
  MapPin,
  PenSquare,
  Landmark,
  Heart,
  Mail,
} from "lucide-react";

// Add a style object for the FiraGo font
const userMenuStyles = {
  fontFamily: '"FiraGo", sans-serif',
};

interface UserMenuProps {
  onNavigate?: () => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
  hideButton?: boolean; // Hide the button trigger (for mobile where hamburger controls it)
}

export default function UserMenu({
  onNavigate,
  isOpenExternal,
  onCloseExternal,
  hideButton = false,
}: UserMenuProps) {
  const { user, isLoading, logout } = useAuth();
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Use external state if provided, otherwise internal
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : isOpenInternal;
  const setIsOpen = (value: boolean) => {
    if (isOpenExternal !== undefined && onCloseExternal) {
      if (!value) onCloseExternal();
    } else {
      setIsOpenInternal(value);
    }
  };

  // Add state to store profile image URL
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleLinkClick = () => {
    handleClose();
    onNavigate?.();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 400); // Delay to allow animation to complete
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
        if (process.env.NODE_ENV === "development") {
          console.log(
            "Using Cloudinary profile image directly:",
            user.profileImage
          );
        }
        setProfileImage(user.profileImage);
      } else {
        // For other sources like S3, set immediately but validate in the background
        setProfileImage(user.profileImage);
      }
    } else {
      setProfileImage("/avatar.jpg");
    }

    if (process.env.NODE_ENV === "development") {
      console.log("User profile updated:", user);
    }
  }, [user]);

  useEffect(() => {
    // Don't add click outside listener for mobile (when hideButton is true)
    // because hamburger controls the menu
    if (hideButton) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [hideButton]);

  if (isLoading) {
    // Don't show loader if button is hidden (mobile mode)
    if (hideButton) return null;
    return <div className="loader"></div>;
  }

  if (!user) {
    // If button is hidden (mobile), show login link in a different way
    if (hideButton && isOpen) {
      return (
        <div
          className="user-menu-container mobile-menu-open"
          style={userMenuStyles}
        >
          <div className="dropdown open" ref={menuRef}>
            <div className="dropdown-menu">
              <button
                className="close-menu-btn"
                onClick={handleClose}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
              <Link
                href="/login"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <User size={18} />
                <span>{t("navigation.login")}</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }
    if (hideButton) return null;
    return (
      <Link href="/login" className="button" onClick={handleLinkClick}>
        🎭
        {/* <Theater size={20} />  */}
        <span className="icon"> {t("navigation.login")}</span>
      </Link>
    );
  }

  return (
    <div
      className={`user-menu-container ${hideButton ? "mobile-menu-open" : ""}`}
      style={userMenuStyles}
    >
      <div
        className={`dropdown ${isOpen ? "open" : ""} ${
          isClosing ? "closing" : ""
        }`}
        ref={menuRef}
      >
        {!hideButton && (
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
            <span className="icon chevron-icon">▼</span>
            {/* <ChevronDown size={16} className="chevron-icon" /> */}
          </button>
        )}
        {isOpen && (
          <div className="dropdown-menu">
            {/* Mobile only: Header row with language/cart on left, X on right */}
            {hideButton && (
              <div className="mobile-menu-header-row">
                <div className="mobile-menu-left-actions">
                  <LanguageSwitcher onNavigate={handleLinkClick} />
                  <CartIcon onNavigate={handleLinkClick} />
                </div>
                <button
                  className="close-menu-btn"
                  onClick={handleClose}
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Desktop: Just close button */}
            {!hideButton && (
              <button
                className="close-menu-btn"
                onClick={handleClose}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            )}

            {/* Mobile only: Profile header with image - clickable for sellers */}
            {hideButton && (
              <Link
                href={
                  (user.role === "seller" || user.isSeller) && user.artistSlug
                    ? `/@${user.artistSlug}`
                    : "/profile"
                }
                className="mobile-profile-header"
                onClick={handleLinkClick}
              >
                <div className="user-avatar">
                  <Image
                    src={profileImage || "/avatar.jpg"}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="avatar-image"
                    loading="eager"
                    unoptimized
                  />
                </div>
                <span className="profile-name">
                  {user.name || t("navigation.profile")}
                </span>
              </Link>
            )}

            <div className="dropdown-label">{t("navigation.profile")}</div>
            {/* <hr /> */}
            <Link
              href="/profile"
              className="dropdown-item"
              onClick={handleLinkClick}
            >
              <User size={18} />
              <span>{t("navigation.profile")}</span>
            </Link>
            <Link
              href="/profile/addresses"
              className="dropdown-item"
              onClick={handleLinkClick}
            >
              <MapPin size={18} />
              <span>{t("navigation.addresses")}</span>
            </Link>
            <Link
              href="/profile/orders"
              className="dropdown-item"
              onClick={handleLinkClick}
            >
              <ShoppingBag size={18} />
              <span>{t("navigation.myOrders")}</span>
            </Link>

            {/* რეფერალების ლინკი ყველა ავტორიზებული მომხმარებლისთვის */}
            <Link
              href="/referrals"
              className="dropdown-item"
              onClick={handleLinkClick}
            >
              <Gift size={18} />
              <span>{t("navigation.referrals")}</span>
            </Link>

            {(user.role?.toLowerCase() === Role.Admin ||
              user.role?.toLowerCase() === Role.Seller ||
              user.role?.toLowerCase() === Role.Blogger) && (
              <>
                {/* <hr /> */}
                <div className="dropdown-label">
                  {t("navigation.adminPanel")}
                </div>
                {(user.role?.toLowerCase() === Role.Admin ||
                  user.role?.toLowerCase() === Role.Seller) && (
                  <Link
                    href="/admin/products"
                    className="dropdown-item"
                    onClick={handleLinkClick}
                  >
                    <Package size={18} />
                    <span>{t("navigation.products")}</span>
                  </Link>
                )}
                {(user.role?.toLowerCase() === Role.Admin ||
                  user.role?.toLowerCase() === Role.Blogger) && (
                  <Link
                    href="/admin/blog"
                    className="dropdown-item"
                    onClick={handleLinkClick}
                  >
                    <PenSquare size={18} />
                    <span>{t("navigation.adminBlog")}</span>
                  </Link>
                )}
              </>
            )}
            {user.role?.toLowerCase() === Role.Admin && (
              <>
                <Link
                  href="/admin/banners"
                  className="dropdown-item"
                  onClick={handleLinkClick}
                >
                  <Tag size={18} />
                  <span>{t("navigation.banners")}</span>
                </Link>
                <Link
                  href="/admin/referrals"
                  className="dropdown-item"
                  onClick={handleLinkClick}
                >
                  <Gift size={18} />
                  <span>{t("navigation.adminReferrals")}</span>
                </Link>
              </>
            )}

            {user.role?.toLowerCase() === Role.Admin && (
              <>
                <Link
                  href="/admin/categories"
                  className="dropdown-item"
                  onClick={handleLinkClick}
                >
                  <Settings size={18} />
                  <span>{t("navigation.categories")}</span>
                </Link>
                <Link
                  href="/admin/users"
                  className="dropdown-item"
                  onClick={handleLinkClick}
                >
                  <Users size={18} />
                  <span>{t("navigation.users")}</span>
                </Link>
              </>
            )}

            {(user.role?.toLowerCase() === Role.Admin ||
              user.role?.toLowerCase() === Role.Seller) && (
              <Link
                href="/admin/orders"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <ShoppingBag size={18} />
                <span>{t("navigation.orders")}</span>
              </Link>
            )}

            {/* Balance links */}
            {user.role?.toLowerCase() === Role.Admin && (
              <Link
                href="/admin/balances"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <DollarSign size={18} />
                <span>{t("navigation.balances")}</span>
              </Link>
            )}

            {/* Analytics link */}
            {user.role?.toLowerCase() === Role.Admin && (
              <Link
                href="/admin/analytics"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <BarChart3 size={18} />
                <span>{t("navigation.analytics")}</span>
              </Link>
            )}

            {/* Meta Pixel link - Only for Admin */}
            {user.role?.toLowerCase() === Role.Admin && (
              <Link
                href="/admin/meta-pixel"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <Activity size={18} />
                <span>Meta Pixel</span>
              </Link>
            )}

            {/* BOG Transfers link - Only for Admin */}
            {user.role?.toLowerCase() === Role.Admin && (
              <Link
                href="/admin/bog-transfers"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <Landmark size={18} />
                <span>BOG გადარიცხვები</span>
              </Link>
            )}

            {/* Donations link - Only for Admin */}
            {user.role?.toLowerCase() === Role.Admin && (
              <Link
                href="/admin/donations"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <Heart size={18} />
                <span>დონაციები</span>
              </Link>
            )}

            {/* Seller Notifications link - Only for Admin */}
            {user.role?.toLowerCase() === Role.Admin && (
              <Link
                href="/admin/seller-notifications"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <Mail size={18} />
                <span>სელერებისთვის მეილი</span>
              </Link>
            )}

            {/* Customer Notifications link - Only for Admin */}
            {user.role?.toLowerCase() === Role.Admin && (
              <Link
                href="/admin/customer-notifications"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <Mail size={18} />
                <span>მომხმარებლებისთვის მეილი</span>
              </Link>
            )}

            {user.role?.toLowerCase() === Role.Seller && (
              <Link
                href="/profile/balance"
                className="dropdown-item"
                onClick={handleLinkClick}
              >
                <DollarSign size={18} />
                <span>{t("navigation.myBalance")}</span>
              </Link>
            )}

            <hr />
            <button
              onClick={() => {
                handleClose();
                onNavigate?.();
                logout(undefined, undefined);
              }}
              className="dropdown-item logout-button"
            >
              <LogOut size={18} />
              <span>{t("navigation.logout")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
