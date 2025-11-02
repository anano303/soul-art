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

const collectSearchKeywords = (term: string): string[] => {
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
  register(term.toLowerCase());
  registerText(term);

  if (term.includes(" ")) {
    const condensed = term.replace(/\s+/g, "");
    register(condensed);
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
  const pageKeywords = collectSearchKeywords(decodedKeyword);

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
    title: `ძიება: ${decodedKeyword} - Soulart | Search: ${decodedKeyword}`,
    description: `ძიების შედეგები "${decodedKeyword}" - ხელნაკეთი ნივთები და ნახატები Soulart-ში. Search results for "${decodedKeyword}" - handmade items and paintings at Soulart.`,
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
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: `ძიება: ${decodedKeyword} - Soulart`,
      description: `ძიების შედეგები "${decodedKeyword}" - ხელნაკეთი ნივთები და ნახატები Soulart-ში.`,
      url: `https://soulart.ge/search/${encodeURIComponent(decodedKeyword)}`,
      siteName: "Soulart",
      images: [
        {
          url: "/van-gogh.jpg",
          width: 1200,
          height: 630,
          alt: `Soulart ძიება - ${decodedKeyword}`,
        },
      ],
      locale: "ka_GE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `ძიება: ${decodedKeyword} - Soulart`,
      description: `ძიების შედეგები "${decodedKeyword}" - ხელნაკეთი ნივთები და ნახატები Soulart-ში.`,
      images: ["/van-gogh.jpg"],
    },
    alternates: {
      canonical: `https://soulart.ge/search/${encodeURIComponent(
        decodedKeyword
      )}`,
    },
  };
}

export default function SearchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
