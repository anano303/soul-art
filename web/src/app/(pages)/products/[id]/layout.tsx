import { Metadata } from "next";
import {
  GLOBAL_KEYWORDS,
  collectProductKeywords,
  getArtistKeywords,
  getProductKeywords,
  mergeKeywordSets,
} from "@/lib/seo-keywords";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products/${id}`,
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
    const [globalProductKeywords, artistKeywords] = await Promise.all([
      getProductKeywords(),
      getArtistKeywords(),
    ]);

    const keywords = mergeKeywordSets(
      pageKeywords,
      globalProductKeywords,
      artistKeywords,
      GLOBAL_KEYWORDS
    ).slice(0, 200);

    return {
      title,
      description,
      keywords: keywords.length ? keywords : undefined,
      authors: [{ name: "SoulArt" }],
      creator: "SoulArt",
      publisher: "SoulArt",
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
            : [
                {
                  url: "/logo.png",
                  width: 1200,
                  height: 630,
                  alt: "SoulArt",
                },
              ],
        type: "website",
        locale: "ka_GE",
        siteName: "SoulArt",
        url: `https://soulart.ge/products/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images:
          product.images?.length > 0 ? [product.images[0]] : ["/logo.png"],
      },
      alternates: {
        canonical: `https://soulart.ge/products/${id}`,
      },
      other: {
        "product:price:amount": product.price,
        "product:price:currency": "GEL",
        "product:availability": product.availability
          ? "in stock"
          : "out of stock",
        "product:brand": product.brand,
        "product:category": product.mainCategory?.name || "",
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Product | SoulArt",
      description: "Discover products on SoulArt",
    };
  }
}

export default function ProductLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
