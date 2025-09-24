"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// ფუნქცია რომელიც შექმნის SoulArt icons სხვადასხვა ზომებში
const generateSoulArtIcons = (sourceIconPath: string) => {
  const sizes = [36, 48, 72, 96, 144, 192, 256, 512];

  return sizes.map((size) => ({
    src: sourceIconPath,
    sizes: `${size}x${size}`,
    type: "image/x-icon",
    purpose: size >= 192 ? "any maskable" : "any",
  }));
};

export function useAppIcons() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return {
      currentTheme: "light",
      icons: generateSoulArtIcons("/soulart_icon_blue_fullsizes.ico"),
    };
  }

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isWhiteTheme = currentTheme === "dark";

  return {
    currentTheme,
    icons: generateSoulArtIcons(
      isWhiteTheme
        ? "/soulart_icon_white_fullsizes.ico"
        : "/soulart_icon_blue_fullsizes.ico"
    ),
  };
}

// ფუნქცია manifest.json ფაილის დინამიურად განახლებისთვის
export const updateManifestIcons = (isWhiteTheme: boolean = false) => {
  const baseIconPath = isWhiteTheme
    ? "/soulart_icon_white_fullsizes.ico"
    : "/soulart_icon_blue_fullsizes.ico";

  return [
    {
      src: `${baseIconPath}`,
      sizes: "36x36",
      type: "image/x-icon",
    },
    {
      src: `${baseIconPath}`,
      sizes: "48x48",
      type: "image/x-icon",
    },
    {
      src: `${baseIconPath}`,
      sizes: "72x72",
      type: "image/x-icon",
    },
    {
      src: `${baseIconPath}`,
      sizes: "96x96",
      type: "image/x-icon",
    },
    {
      src: `${baseIconPath}`,
      sizes: "144x144",
      type: "image/x-icon",
    },
    {
      src: `${baseIconPath}`,
      sizes: "192x192",
      type: "image/x-icon",
    },
    {
      src: `${baseIconPath}`,
      sizes: "512x512",
      type: "image/x-icon",
      purpose: "any maskable",
    },
  ];
};

export default useAppIcons;
