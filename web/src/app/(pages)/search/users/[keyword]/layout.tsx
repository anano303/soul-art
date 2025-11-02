import { Metadata } from "next";
import {
  GLOBAL_KEYWORDS,
  extractKeywordsFromText,
  getArtistKeywords,
  getProductKeywords,
  mergeKeywordSets,
  sanitizeKeyword,
} from "@/lib/seo-keywords";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ keyword: string }>;
}

const collectArtistSearchKeywords = (term: string): string[] => {
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

  register(term);
  register(`artist ${term}`);
  register(`artists ${term}`);
  registerText(term);

  if (term.includes(" ")) {
    register(term.replace(/\s+/g, ""));
  }

  return Array.from(keywordMap.values());
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ keyword: string }>;
}): Promise<Metadata> {
  const { keyword } = await params;
  const decodedKeyword = decodeURIComponent(keyword || "");
  const pageKeywords = collectArtistSearchKeywords(decodedKeyword);

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
    title: `Artists: ${decodedKeyword} - Soulart`,
    description: `Search results for artists matching "${decodedKeyword}" on Soulart. Discover talented Georgian artists and their unique handmade artworks.`,
    keywords: keywords.length ? keywords : undefined,
    authors: [{ name: "Soulart" }],
    creator: "Soulart",
    publisher: "Soulart",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: `Artists: ${decodedKeyword} - Soulart`,
      description: `Discover talented artists matching "${decodedKeyword}" on Soulart`,
      url: `https://soulart.ge/search/users/${keyword}`,
      siteName: "Soulart",
      images: [
        {
          url: "/logo.png",
          width: 1200,
          height: 630,
        },
      ],
      locale: "ka_GE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Artists: ${decodedKeyword} - Soulart`,
      description: `Discover talented artists matching "${decodedKeyword}" on Soulart`,
      creator: "@soulart_ge",
      images: ["/logo.png"],
    },
    alternates: {
      canonical: `https://soulart.ge/search/users/${keyword}`,
    },
  };
}

export default function UsersSearchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
