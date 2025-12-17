"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Store, Search, User, Gavel, Palette } from "lucide-react";
import { useUser } from "@/modules/auth/hooks/use-user";
import { useLanguage } from "@/hooks/LanguageContext";
import "./mobile-bottom-nav.css";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const scrollThreshold = 10; // Minimum scroll distance to trigger hide/show

  // Check if user is an artist/seller
  const isSeller = user?.role === "seller" || user?.isSeller;

  // Define bottom nav routes - all main pages
  const navRoutes = [
    "/",
    "/shop",
    "/explore",
    "/auction",
    "/sellers-register",
    "/profile",
    ...(isSeller && user?.artistSlug ? [`/@${user.artistSlug}`] : []),
  ];

  // Check if current page is in bottom nav
  // Include product detail pages and admin pages
  const isBottomNavPage = 
    navRoutes.some((route) => {
      if (route === "/") return pathname === "/";
      return pathname.startsWith(route);
    }) ||
    pathname.startsWith("/products/") || // Product detail pages
    pathname.startsWith("/admin/") || // Admin panel pages
    pathname.startsWith("/profile"); // Profile pages

  // Only show bottom nav on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle scroll behavior
  useEffect(() => {
    if (!isMobile || !isBottomNavPage) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDifference = Math.abs(currentScrollY - lastScrollY);

      // Only trigger if scroll difference is significant
      if (scrollDifference < scrollThreshold) return;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide nav
        setIsVisible(false);
      } else {
        // Scrolling up - show nav
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isMobile, isBottomNavPage]);

  // Don't render on desktop or non-nav pages
  if (!isMobile || !isBottomNavPage) return null;

  type TabItem = {
    href: string;
    icon: typeof Home;
    label: string;
    active: boolean;
    onClick?: () => void;
  };

  const tabs: TabItem[] = [
    {
      href: "/",
      icon: Home,
      label: language === "en" ? "Home" : "მთავარი",
      active: pathname === "/",
    },
    {
      href: "/shop",
      icon: Store,
      label: language === "en" ? "Store" : "მაღაზია",
      active: pathname.startsWith("/shop"),
    },
    {
      href: "/explore",
      icon: Search,
      label: language === "en" ? "Explore" : "აღმოაჩინე",
      active: pathname.startsWith("/explore"),
    },
  ];

  // Add seller page or registration based on user status (before auction and orders)
  if (isSeller && user?.artistSlug) {
    // If seller, show their artist page
    const artistPath = `/@${user.artistSlug}`;
    tabs.push({
      href: artistPath,
      icon: User,
      label: language === "en" ? "My Page" : "ჩემი გვერდი",
      active: pathname === artistPath,
    });
  } else {
    // If not seller, show seller registration
    tabs.push({
      href: "/sellers-register",
      icon: Palette,
      label: language === "en" ? "Sell" : "გაყიდე",
      active: pathname.startsWith("/sellers-register"),
    });
  }

  // Add auction after seller page
  tabs.push({
    href: "/auction",
    icon: Gavel,
    label: language === "en" ? "Auction" : "აუქციონი",
    active: pathname.startsWith("/auction"),
  });

  // Add profile tab at the end
  tabs.push({
    href: "/profile",
    icon: User,
    label: language === "en" ? "Profile" : "პროფილი",
    active: pathname.startsWith("/profile"),
  });

  return (
    <nav
      className={`mobile-bottom-nav ${
        isVisible ? "mobile-bottom-nav--visible" : "mobile-bottom-nav--hidden"
      }`}
    >
      <div className="mobile-bottom-nav__container">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          // Special handling for orders tab with onClick
          if (tab.onClick) {
            return (
              <button
                key={tab.href}
                onClick={tab.onClick}
                className={`mobile-bottom-nav__tab ${
                  tab.active ? "mobile-bottom-nav__tab--active" : ""
                }`}
              >
                <Icon
                  size={24}
                  className="mobile-bottom-nav__icon"
                  strokeWidth={tab.active ? 2.5 : 2}
                />
                <span className="mobile-bottom-nav__label">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mobile-bottom-nav__tab ${
                tab.active ? "mobile-bottom-nav__tab--active" : ""
              }`}
            >
              <Icon
                size={24}
                className="mobile-bottom-nav__icon"
                strokeWidth={tab.active ? 2.5 : 2}
              />
              <span className="mobile-bottom-nav__label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
