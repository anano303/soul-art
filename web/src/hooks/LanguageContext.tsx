"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { TRANSLATIONS } from "./Languages";

type Language = "en" | "ge";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Get the initial language from localStorage or default to 'ge'
  const [language, setLanguage] = useState<Language>("ge");

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "ge")) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  // Translation function that works with the nested structure in Languages.ts
  const t = (key: string): string => {
    // If key doesn't contain dots, it's not a nested path
    if (!key.includes(".")) {
      return key;
    }

    try {
      // Split the key into parts to traverse the nested structure
      const parts = key.split(".");
      let result = TRANSLATIONS[language];

      // Navigate through the nested structure
      for (const part of parts) {
        if (!result || typeof result !== "object") {
          // If we can't go deeper but still have parts to process, try English fallback
          if (language !== "en") {
            let enResult = TRANSLATIONS.en;
            let foundInEn = true;

            // Try to find the key in English translations
            for (const p of parts) {
              if (!enResult || typeof enResult !== "object" || !enResult[p]) {
                foundInEn = false;
                break;
              }
              enResult = enResult[p];
            }

            if (foundInEn && typeof enResult === "string") {
              return enResult;
            }
          }

          // If not found in either language, return the key itself
          return key;
        }

        result = result[part];
      }

      // Return the result if it's a string, otherwise return the key
      return typeof result === "string" ? result : key;
    } catch (error) {
      console.error(`Error translating key: ${key}`, error);
      return key;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
