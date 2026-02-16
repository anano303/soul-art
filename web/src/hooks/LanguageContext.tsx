"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
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
  // Helper to add /en prefix to paths when language is English
  localizedPath: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

interface LanguageProviderProps {
  children: ReactNode;
}

// Helper: check if current URL has /en prefix
function getLanguageFromUrl(): Language | null {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  if (path === "/en" || path.startsWith("/en/")) return "en";
  return null;
}

// Helper: read language cookie
function getLanguageFromCookie(): Language | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)language=(\w+)/);
  if (match && (match[1] === "en" || match[1] === "ge")) {
    return match[1] as Language;
  }
  return null;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Get the initial language from localStorage or default to 'ge'
  const [language, setLanguageState] = useState<Language>("ge");
  const languageRef = useRef<Language>("ge");
  const pathname = usePathname();

  // Helper: update URL to show /en prefix or remove it
  const syncUrlWithLanguage = useCallback((lang: Language) => {
    if (typeof window === "undefined") return;
    const currentPath = window.location.pathname;
    const hasEnPrefix = currentPath === "/en" || currentPath.startsWith("/en/");
    const search = window.location.search;
    const hash = window.location.hash;

    if (lang === "en" && !hasEnPrefix) {
      // Add /en prefix
      const newPath = `/en${currentPath === "/" ? "" : currentPath}` || "/en";
      window.history.replaceState({}, "", newPath + search + hash);
    } else if (lang === "ge" && hasEnPrefix) {
      // Remove /en prefix
      const newPath = currentPath.replace(/^\/en\/?/, "/") || "/";
      window.history.replaceState({}, "", newPath + search + hash);
    }
  }, []);

  // Load language preference on mount: queryParam > URL > cookie > localStorage > default
  useEffect(() => {
    // Check ?lang= query parameter (used by /en redirect)
    const params = new URLSearchParams(window.location.search);
    const queryLang = params.get("lang") as Language | null;
    const urlLang = getLanguageFromUrl();
    const cookieLang = getLanguageFromCookie();
    const savedLanguage = localStorage.getItem("language") as Language;

    let detectedLang: Language = "ge";

    if (queryLang === "en" || queryLang === "ge") {
      detectedLang = queryLang;
      // Clean up the ?lang= param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("lang");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } else if (urlLang) {
      detectedLang = urlLang;
    } else if (cookieLang) {
      detectedLang = cookieLang;
    } else if (
      savedLanguage &&
      (savedLanguage === "en" || savedLanguage === "ge")
    ) {
      detectedLang = savedLanguage;
    }

    setLanguageState(detectedLang);
    languageRef.current = detectedLang;
    localStorage.setItem("language", detectedLang);
    document.cookie = `language=${detectedLang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    // Sync URL with detected language
    syncUrlWithLanguage(detectedLang);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When Next.js navigates (pathname changes), re-sync /en prefix in URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Small delay to let Next.js finish updating the URL
    const timer = setTimeout(() => {
      syncUrlWithLanguage(languageRef.current);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, syncUrlWithLanguage]);

  // Update URL when language changes
  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      languageRef.current = lang;
      localStorage.setItem("language", lang);

      // Set cookie for middleware and server-side detection
      document.cookie = `language=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

      // Update <html lang> attribute for accessibility and SEO
      document.documentElement.lang = lang === "en" ? "en" : "ka";

      // Sync URL prefix
      syncUrlWithLanguage(lang);
    },
    [syncUrlWithLanguage],
  );

  // Update <html lang> when language changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = language === "en" ? "en" : "ka";
    }
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
    values?: Record<string, string | number>,
  ): string => {
    if (!values) return text;

    let interpolatedText = text;
    Object.keys(values).forEach((key) => {
      interpolatedText = interpolatedText.replace(
        new RegExp(`{${key}}`, "g"),
        String(values[key]),
      );
    });

    return interpolatedText;
  };

  // Helper to add /en prefix when language is English
  const localizedPath = useCallback(
    (path: string): string => {
      if (language === "en") {
        // Don't double-prefix
        if (path.startsWith("/en")) return path;
        // Don't prefix API routes, _next, or external URLs
        if (
          path.startsWith("/api") ||
          path.startsWith("/_next") ||
          path.startsWith("http")
        )
          return path;
        return `/en${path === "/" ? "" : path}` || "/en";
      }
      return path;
    },
    [language],
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, localizedPath }}
    >
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
