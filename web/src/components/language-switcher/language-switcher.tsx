"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import { useState, useRef, useEffect } from "react";
import "./language-switcher.css";

export function LanguageSwitcher() {
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

  return (
    <div className="language-switcher" ref={switcherRef}>
      <button className="language-button" onClick={toggleDropdown}>
        {language === "ge" ? "ქარ" : "ENG"}
      </button>

      {isOpen && (
        <div className="language-dropdown">
          <button
            className={`language-option ${language === "ge" ? "active" : ""}`}
            onClick={() => setLanguage("ge")}
          >
            ქარ
          </button>
          <button
            className={`language-option ${language === "en" ? "active" : ""}`}
            onClick={() => setLanguage("en")}
          >
            ENG
          </button>
        </div>
      )}
    </div>
  );
}
