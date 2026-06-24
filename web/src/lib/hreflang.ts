// Helpers for bilingual (ka / en) SEO metadata.
//
// English is currently served via the ?lang=en query param (client-side
// LanguageContext). To make the two language versions discoverable and avoid
// duplicate-content penalties, every localizable page declares:
//   - a self-referential canonical for the current locale, and
//   - hreflang alternates (ka, en, x-default) so Google pairs the versions.
//
// `x-default` -> the Georgian (default) URL.

const SITE = "https://soulart.ge";

export type Locale = "ka" | "en";

/** Normalize a ?lang value into a supported locale. */
export function resolveLocale(lang?: string | string[] | null): Locale {
  const value = Array.isArray(lang) ? lang[0] : lang;
  return value === "en" ? "en" : "ka";
}

/** Append ?lang=en (or &lang=en) to a path. */
function withLang(path: string, locale: Locale): string {
  if (locale === "ka") return `${SITE}${path}`;
  const sep = path.includes("?") ? "&" : "?";
  return `${SITE}${path}${sep}lang=en`;
}

/**
 * Build `alternates` for a page's metadata.
 * @param path  the path WITHOUT locale (e.g. "/products/abc" or "/shop?brand=x")
 * @param locale the locale this page is currently being rendered for
 */
export function buildAlternates(path: string, locale: Locale) {
  return {
    canonical: withLang(path, locale),
    languages: {
      ka: withLang(path, "ka"),
      en: withLang(path, "en"),
      "x-default": withLang(path, "ka"),
    },
  };
}
