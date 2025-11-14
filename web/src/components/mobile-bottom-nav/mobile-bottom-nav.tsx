"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Search, User } from "lucide-react";
import { useUser } from "@/modules/auth/hooks/use-user";
import { useLanguage } from "@/hooks/LanguageContext";
import "./mobile-bottom-nav.css";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const scrollThreshold = 10; // Minimum scroll distance to trigger hide/show

  // Check if user is an artist
  const isArtist = user?.role === "seller" || user?.isSeller;

  // Define bottom nav routes
  const navRoutes = [
    "/",
    "/shop",
    "/explore",
    ...(isArtist && user ? [`/@${user.artistSlug}`] : []),
  ];

  // Check if current page is in bottom nav
  const isBottomNavPage = navRoutes.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname.startsWith(route);
  });

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

  const tabs = [
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

  // Add profile tab if user is artist
  if (isArtist && user && user.artistSlug) {
    const artistPath = `/@${user.artistSlug}`;
    tabs.push({
      href: artistPath,
      icon: User,
      label: language === "en" ? "Profile" : "პროფილი",
      active: pathname === artistPath,
    });
  }

  return (
    <nav
      className={`mobile-bottom-nav ${isVisible ? "mobile-bottom-nav--visible" : "mobile-bottom-nav--hidden"}`}
    >
      <div className="mobile-bottom-nav__container">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mobile-bottom-nav__tab ${tab.active ? "mobile-bottom-nav__tab--active" : ""}`}
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
