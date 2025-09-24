"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export default function DynamicManifest() {
  const { theme, systemTheme } = useTheme();

  useEffect(() => {
    const currentTheme = theme === "system" ? systemTheme : theme;

    // Remove existing manifest link
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.remove();
    }

    // Add new manifest with theme parameter
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = `/api/manifest?theme=${currentTheme}`;
    document.head.appendChild(manifestLink);

    // Update theme color meta tag
    const existingThemeColor = document.querySelector(
      'meta[name="theme-color"]'
    );
    if (existingThemeColor) {
      existingThemeColor.setAttribute(
        "content",
        currentTheme === "dark" ? "#ffffff" : "#012645"
      );
    }

    // Update apple web app status bar style
    const existingAppleStatusBar = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );
    if (existingAppleStatusBar) {
      existingAppleStatusBar.setAttribute(
        "content",
        currentTheme === "dark" ? "black-translucent" : "default"
      );
    }
  }, [theme, systemTheme]);

  return null;
}
