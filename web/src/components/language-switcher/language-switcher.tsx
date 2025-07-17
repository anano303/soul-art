"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import { useState, useRef, useEffect } from "react";
import "./language-switcher.css";

export function LanguageSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  // Initialize with null to avoid hydration mismatch
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

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

  // Set mobile status only on client-side after component mounts
  useEffect(() => {
    // Initial check for mobile
    setIsMobile(window.innerWidth <= 992);

    // Update on resize
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 992);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="language-switcher"
      data-mobile={isMobile === true ? "true" : "false"}
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
