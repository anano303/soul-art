import { Metadata } from "next";

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
        title: "Product Not Found | MyHunter",
        description: "The requested product could not be found.",
      };
    }

    const product = await response.json();

    const title = `${product.name} - ${product.brand} | MyHunter`;

    let description =
      product.description?.slice(0, 160) ||
      `${product.name} by ${product.brand}`;
    if (product.hashtags && product.hashtags.length > 0) {
      const hashtagText = product.hashtags
        .map((tag: string) => `#${tag}`)
        .join(" ");
      description = `${description} ${hashtagText}`.slice(0, 160);
    }

    const categoryKeywords = [];
    if (
      typeof product.mainCategory === "object" &&
      product.mainCategory?.name
    ) {
      categoryKeywords.push(product.mainCategory.name);
    }
    if (typeof product.subCategory === "object" && product.subCategory?.name) {
      categoryKeywords.push(product.subCategory.name);
    }

    const keywords = [
      product.name,
      product.brand,
      ...categoryKeywords,
      ...(product.hashtags || []),
      "სანადირო",
      "სათევზაო",
      "აღჭურვილობა",
      "მაღაზია",
      "MyHunter",
      "მაიჰანტერი",
      "საქართველო",
      "hunting",
      "fishing",
      "equipment",
      "store",
      "Georgia",
      "outdoor",
      "gear",
    ].join(", ");

    return {
      title,
      description,
      keywords,
      authors: [{ name: "MyHunter" }],
      creator: "MyHunter",
      publisher: "MyHunter",
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
                  alt: "MyHunter",
                },
              ],
        type: "website",
        locale: "ka_GE",
        siteName: "MyHunter",
        url: `https://myhunter.ge/products/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images:
          product.images?.length > 0 ? [product.images[0]] : ["/logo.png"],
      },
      alternates: {
        canonical: `https://myhunter.ge/products/${id}`,
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
      title: "Product | MyHunter",
      description: "Discover products on MyHunter",
    };
  }
}

export default function ProductLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
