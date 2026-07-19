"use client";

import React from "react";
import Link from "next/link";
import "./button.css";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * Standard site button. Two variants only:
 *  - primary   → solid gold pill (main CTAs)
 *  - secondary → navy outline pill
 * Renders a Next <Link> when `href` is passed, otherwise a <button>.
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "sa-btn",
    `sa-btn--${variant}`,
    `sa-btn--${size}`,
    fullWidth ? "sa-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorRest } =
      rest as React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}

export default Button;
