import { Metadata } from "next";
import {
  GLOBAL_KEYWORDS,
  collectProductKeywords,
  extractKeywordsFromText,
  getArtistKeywords,
  getProductKeywords,
  mergeKeywordSets,
  sanitizeKeyword,
} from "@/lib/seo-keywords";

interface HeadProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: HeadProps): Promise<Metadata> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products/${params.id}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        title: "Product Not Found | SoulArt",
        description: "The requested product could not be found.",
      };
    }

    const product = await response.json();

    const title = `${product.name} - ${product.brand} | SoulArt`;

    let description =
      product.description?.slice(0, 160) ||
      `${product.name} by ${product.brand}`;
    if (product.hashtags && product.hashtags.length > 0) {
      const hashtagText = product.hashtags
        .map((tag: string) => `#${tag}`)
        .join(" ");
      description = `${description} ${hashtagText}`.slice(0, 160);
    }

    const pageKeywords = collectProductKeywords(product);
    const brandKeyword = sanitizeKeyword(product.brand);
    const metadataKeywords = mergeKeywordSets(
      pageKeywords,
      extractKeywordsFromText(title),
      extractKeywordsFromText(description),
      brandKeyword ? [brandKeyword] : undefined
    );

    const [globalProductKeywords, artistKeywords] = await Promise.all([
      getProductKeywords(),
      getArtistKeywords(),
    ]);

    const keywords = mergeKeywordSets(
      metadataKeywords,
      globalProductKeywords,
      artistKeywords,
      GLOBAL_KEYWORDS
    ).slice(0, 200);

    return {
      title,
      description,
      keywords: keywords.length ? keywords : undefined,
      openGraph: {
        title,
        description,
        images:
          product.images?.length > 0
            ? [
                {
                  url: product.images[0],
                  width: 1200,
                  height: 630,
                  alt: product.name,
                },
              ]
            : [],
        type: "website",
        locale: "ka_GE",
        siteName: "soulart",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: product.images?.length > 0 ? [product.images[0]] : [],
      },
      alternates: {
        canonical: `https://soulart.ge/products/${params.id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Product | SoulArt",
      description: "Discover unique artworks on SoulArt",
    };
  }
}
