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

// Define recursive type for nested translations
interface TranslationContent {
  [key: string]: string | TranslationContent;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  // Update the type signature to accept optional values for interpolation
  t: (key: string, values?: Record<string, string | number>) => string;
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

  // Updated translation function that supports interpolation
  const t = (key: string, values?: Record<string, string | number>): string => {
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
            let enResult = TRANSLATIONS.en as TranslationContent;
            let foundInEn = true;

            // Try to find the key in English translations
            for (const p of parts) {
              if (
                !enResult ||
                typeof enResult !== "object" ||
                !(p in enResult)
              ) {
                foundInEn = false;
                break;
              }

              enResult = enResult[p] as TranslationContent;
            }

            if (foundInEn && typeof enResult === "string") {
              return interpolateValues(enResult, values);
            }
          }

          // If not found in either language, return the key itself
          return key;
        }

        result = result[part] as TranslationContent;
      }

      // Return the result if it's a string, otherwise return the key
      return typeof result === "string"
        ? interpolateValues(result, values)
        : key;
    } catch (error) {
      console.error(`Error translating key: ${key}`, error);
      return key;
    }
  };

  // Helper function to replace placeholders with values
  const interpolateValues = (
    text: string,
    values?: Record<string, string | number>
  ): string => {
    if (!values) return text;

    let interpolatedText = text;
    Object.keys(values).forEach((key) => {
      interpolatedText = interpolatedText.replace(
        new RegExp(`{${key}}`, "g"),
        String(values[key])
      );
    });

    return interpolatedText;
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
