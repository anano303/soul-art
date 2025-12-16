import { Metadata } from "next";
import Script from "next/script";
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

// ფუნქცია პროდუქტის მოტანისთვის (რომ ორივე generateMetadata და layout-ში გამოვიყენოთ)
async function getProduct(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products/${id}`,
      {
        cache: "no-store",
      }
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
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

    // სრული სათაური პროდუქტის ყველა მონაცემით
    const categoryName =
      product.subCategory?.name ||
      product.category?.name ||
      product.mainCategory?.name ||
      "";
    const title = `${product.name}${
      categoryName ? ` - ${categoryName}` : ""
    } | ${product.brand} | SoulArt`;

    // სრული აღწერა ყველა დეტალით
    const descriptionParts: string[] = [];

    // ძირითადი აღწერა
    if (product.description) {
      descriptionParts.push(product.description.slice(0, 100));
    }

    // ფასი
    if (product.discountedPrice && product.discountedPrice < product.price) {
      descriptionParts.push(
        `ფასი: ₾${product.discountedPrice} (ფასდაკლება ${product.discountPercentage}%)`
      );
    } else if (product.price) {
      descriptionParts.push(`ფასი: ₾${product.price}`);
    }

    // ზომები (dimensions)
    if (product.dimensions) {
      const dims =
        typeof product.dimensions === "string"
          ? JSON.parse(product.dimensions)
          : product.dimensions;
      if (dims.width || dims.height) {
        descriptionParts.push(
          `ზომა: ${dims.width || ""}x${dims.height || ""}${
            dims.depth ? `x${dims.depth}` : ""
          } სმ`
        );
      }
    }

    // sizes (ტანსაცმლის ზომები)
    if (product.sizes?.length > 0) {
      descriptionParts.push(`ზომები: ${product.sizes.join(", ")}`);
    }

    // ფერები
    if (product.colors?.length > 0) {
      descriptionParts.push(`ფერები: ${product.colors.join(", ")}`);
    }

    // მასალები
    if (product.materials?.length > 0) {
      descriptionParts.push(`მასალა: ${product.materials.join(", ")}`);
    }

    // hashtags
    if (product.hashtags?.length > 0) {
      descriptionParts.push(
        product.hashtags.map((tag: string) => `#${tag}`).join(" ")
      );
    }

    const description = descriptionParts.join(" | ").slice(0, 300);

    const pageKeywords = collectProductKeywords(product);
    const [globalProductKeywords, artistKeywords] = await Promise.all([
      getProductKeywords(),
      getArtistKeywords(),
    ]);

    // დამატებითი keywords პროდუქტის ყველა ინფოდან
    const extraKeywords: string[] = [];
    if (product.name) extraKeywords.push(product.name);
    if (product.nameEn) extraKeywords.push(product.nameEn);
    if (product.brand) extraKeywords.push(product.brand);
    if (product.sizes) extraKeywords.push(...product.sizes);
    if (product.colors) extraKeywords.push(...product.colors);
    if (product.materials) extraKeywords.push(...product.materials);
    if (product.materialsEn) extraKeywords.push(...product.materialsEn);
    if (product.hashtags) extraKeywords.push(...product.hashtags);
    if (product.ageGroups) extraKeywords.push(...product.ageGroups);
    if (categoryName) extraKeywords.push(categoryName);
    if (product.mainCategory?.name)
      extraKeywords.push(product.mainCategory.name);
    if (product.subCategory?.name) extraKeywords.push(product.subCategory.name);

    const keywords = mergeKeywordSets(
      extraKeywords,
      pageKeywords,
      globalProductKeywords,
      artistKeywords,
      GLOBAL_KEYWORDS
    ).slice(0, 250);

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

export default async function ProductLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const product = await getProduct(id);

  // Parse dimensions
  let parsedDimensions: {
    width?: number;
    height?: number;
    depth?: number;
  } | null = null;
  if (product?.dimensions) {
    try {
      parsedDimensions =
        typeof product.dimensions === "string"
          ? JSON.parse(product.dimensions)
          : product.dimensions;
    } catch {
      parsedDimensions = null;
    }
  }

  // JSON-LD Structured Data for Google Rich Snippets (სრული ინფორმაცია)
  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        // ინგლისური სახელიც დავამატოთ alternateName-ში
        ...(product.nameEn && { alternateName: product.nameEn }),
        description: product.description || product.summary || "",
        image: product.images?.length > 0 ? product.images : ["/logo.png"],
        brand: {
          "@type": "Brand",
          name: product.brand || "SoulArt",
        },
        // კატეგორიები
        category:
          [
            product.mainCategory?.name,
            product.category?.name,
            product.subCategory?.name,
          ]
            .filter(Boolean)
            .join(" > ") || "ხელნაკეთი ნივთები",
        // ზომები (dimensions)
        ...(parsedDimensions &&
          (parsedDimensions.width || parsedDimensions.height) && {
            size: `${parsedDimensions.width || ""}x${
              parsedDimensions.height || ""
            }${parsedDimensions.depth ? `x${parsedDimensions.depth}` : ""} სმ`,
            width: parsedDimensions.width
              ? {
                  "@type": "QuantitativeValue",
                  value: parsedDimensions.width,
                  unitCode: "CMT",
                }
              : undefined,
            height: parsedDimensions.height
              ? {
                  "@type": "QuantitativeValue",
                  value: parsedDimensions.height,
                  unitCode: "CMT",
                }
              : undefined,
            depth: parsedDimensions.depth
              ? {
                  "@type": "QuantitativeValue",
                  value: parsedDimensions.depth,
                  unitCode: "CMT",
                }
              : undefined,
          }),
        // ტანსაცმლის ზომები
        ...(product.sizes?.length > 0 && {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "ზომები",
              value: product.sizes.join(", "),
            },
          ],
        }),
        // ფერები
        ...(product.colors?.length > 0 && { color: product.colors.join(", ") }),
        // მასალები
        ...(product.materials?.length > 0 && {
          material: product.materials.join(", "),
        }),
        // Hashtags როგორც keywords
        ...(product.hashtags?.length > 0 && {
          keywords: product.hashtags.join(", "),
        }),
        // ფასი და შეთავაზება
        offers: {
          "@type": "Offer",
          url: `https://soulart.ge/products/${id}`,
          priceCurrency: "GEL",
          price: product.discountedPrice || product.price,
          priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          availability:
            product.stockQuantity > 0 || product.countInStock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@type": "Organization",
            name: "SoulArt",
            url: "https://soulart.ge",
          },
        },
        // მწარმოებელი/გამყიდველი
        manufacturer: {
          "@type": "Organization",
          name: product.brand || "SoulArt",
        },
        // SKU (პროდუქტის ID)
        sku: product._id,
        // რეიტინგი თუ აქვს
        ...(product.numReviews > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating || 5,
            reviewCount: product.numReviews,
            bestRating: 5,
            worstRating: 1,
          },
        }),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <Script
          id="product-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
