"use client";

import Link, { LinkProps } from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import { forwardRef, ReactNode } from "react";

interface LocalizedLinkProps extends Omit<LinkProps, "href"> {
  href: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  "aria-label"?: string;
  title?: string;
  id?: string;
  role?: string;
  tabIndex?: number;
}

/**
 * A wrapper around Next.js Link that automatically adds /en prefix
 * when the current language is English.
 *
 * Usage: Replace `<Link href="/products/123">` with `<LocalizedLink href="/products/123">`
 * When language is English, it renders as `/en/products/123`
 * When language is Georgian, it renders as `/products/123`
 */
export const LocalizedLink = forwardRef<HTMLAnchorElement, LocalizedLinkProps>(
  function LocalizedLink({ href, children, ...props }, ref) {
    const { localizedPath } = useLanguage();

    // Only localize internal paths (starting with /)
    const localizedHref =
      typeof href === "string" && href.startsWith("/")
        ? localizedPath(href)
        : href;

    return (
      <Link href={localizedHref} ref={ref} {...props}>
        {children}
      </Link>
    );
  },
);
