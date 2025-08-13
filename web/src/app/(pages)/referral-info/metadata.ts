import { Metadata } from "next";
import { TRANSLATIONS, TranslationContent } from "@/hooks/Languages";

export function generateMetadata(locale = "ge"): Metadata {
  const t = (key: string) => {
    const parts = key.split(".");
    let result: TranslationContent | string = TRANSLATIONS[locale];
    for (const part of parts) {
      if (!result || typeof result !== "object") return key;
      result = result[part] as TranslationContent | string;
    }
    return typeof result === "string" ? result : key;
  };

  return {
    title: {
      default: t("referral.pageTitle"),
      template: "%s | SoulArt.ge",
    },
    description: t("referral.pageDescription"),
    openGraph: {
      title: t("referral.pageTitle"),
      description: t("referral.pageDescription"),
      images: "/referral-banner.jpg",
    },
    twitter: {
      card: "summary_large_image",
      title: t("referral.pageTitle"),
      description: t("referral.pageDescription"),
      images: "/referral-banner.jpg",
    },
  };
}
