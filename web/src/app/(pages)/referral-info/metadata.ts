import { Metadata } from "next";
import {
  GLOBAL_KEYWORDS,
  extractKeywordsFromText,
  getArtistKeywords,
  getProductKeywords,
  mergeKeywordSets,
  sanitizeKeyword,
} from "@/lib/seo-keywords";

const collectReferralKeywords = (
  title: string,
  description: string
): string[] => {
  const keywordMap = new Map<string, string>();

  const register = (value?: string | null) => {
    const sanitized = sanitizeKeyword(value);
    if (!sanitized) {
      return;
    }

    const key = sanitized.toLowerCase();
    if (!keywordMap.has(key)) {
      keywordMap.set(key, sanitized);
    }
  };

  const registerText = (value?: string | null) => {
    extractKeywordsFromText(value).forEach(register);
  };

  register(title);
  registerText(title);
  registerText(description);
  register("referral program");
  register("bonus");
  register("rewards");

  return Array.from(keywordMap.values());
};

export async function generateMetadata(locale = "ge"): Promise<Metadata> {
  const metadata = {
    ge: {
      title: "რეფერალური სისტემა | SoulArt.ge",
      description:
        "გამოიმუშავე ფული SoulArt.ge-ზე! მოიწვიე მეგობრები და მიიღე ფულადი ბონუსები ყველა წარმატებული რეფერალისთვის.",
    },
    en: {
      title: "Referral System | SoulArt.ge",
      description:
        "Earn money on SoulArt.ge! Invite friends and receive cash bonuses for every successful referral.",
    },
  };

  const content = metadata[locale as keyof typeof metadata] || metadata.ge;
  const pageKeywords = collectReferralKeywords(
    content.title,
    content.description
  );
  const [productKeywords, artistKeywords] = await Promise.all([
    getProductKeywords(),
    getArtistKeywords(),
  ]);

  const keywords = mergeKeywordSets(
    pageKeywords,
    productKeywords,
    artistKeywords,
    GLOBAL_KEYWORDS
  ).slice(0, 200);

  return {
    title: {
      default: content.title,
      template: "%s | SoulArt.ge",
    },
    description: content.description,
    keywords: keywords.length ? keywords : undefined,
    openGraph: {
      title: content.title,
      description: content.description,
      images: "/referral-banner.jpg",
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
      images: "/referral-banner.jpg",
    },
  };
}
