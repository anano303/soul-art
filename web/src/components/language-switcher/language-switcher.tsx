"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import { useState, useRef, useEffect } from "react";
import "./language-switcher.css";

export function LanguageSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Track if we're on mobile - use a more aggressive threshold to ensure dropdown shows above
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 900 : false
  );

  // Update mobile status on window resize
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={`language-switcher ${isMobile ? "mobile-view" : ""}`}
      ref={switcherRef}
    >
      <button
        className={`language-button ${isOpen ? "active" : ""}`}
        onClick={toggleDropdown}
      >
        {language === "en" ? "ENG" : "ქარ"}
      </button>

      {isOpen && (
        <div className="language-dropdown">
          <button
            className={`language-option ${language === "ge" ? "active" : ""}`}
            onClick={() => {
              setLanguage("ge");
              setIsOpen(false);
              onNavigate?.();
            }}
          >
            ქარ
          </button>
          <button
            className={`language-option ${language === "en" ? "active" : ""}`}
            onClick={() => {
              setLanguage("en");
              setIsOpen(false);
              onNavigate?.();
            }}
          >
            ENG
          </button>
        </div>
      )}
    </div>
  );
}
