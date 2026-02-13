"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/LanguageContext";
import { useCallback, useMemo } from "react";

/**
 * A wrapper around Next.js useRouter that automatically adds /en prefix
 * when the current language is English.
 * 
 * Usage: 
 *   const router = useLocalizedRouter();
 *   router.push("/products/123"); // becomes /en/products/123 when English
 */
export function useLocalizedRouter() {
  const router = useRouter();
  const { localizedPath } = useLanguage();

  const push = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      const localized = href.startsWith("/") ? localizedPath(href) : href;
      return router.push(localized, options);
    },
    [router, localizedPath]
  );

  const replace = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      const localized = href.startsWith("/") ? localizedPath(href) : href;
      return router.replace(localized, options);
    },
    [router, localizedPath]
  );

  return useMemo(
    () => ({
      ...router,
      push,
      replace,
    }),
    [router, push, replace]
  );
}
