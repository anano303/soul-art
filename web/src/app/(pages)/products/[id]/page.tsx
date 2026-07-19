import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/modules/products/components/product-details";
import ProductPromoToast from "./ProductPromoToast";
import { getProduct } from "@/lib/get-product";
import { collectProductKeywords, mergeKeywordSets } from "@/lib/seo-keywords";
import { isInStock } from "@/lib/stock";
import { buildProductJsonLd } from "@/lib/structured-data";
import { buildLocaleAlternates, resolveLocale } from "@/lib/hreflang";
import { extractProductId, productHref } from "@/lib/product-slug";

// Metadata lives here (not in layout.tsx) because only a page receives
// `searchParams`, which we need to read ?lang=en and emit English meta.
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = extractProductId(rawId);
  const { lang } = await searchParams;
  const locale = resolveLocale(lang);
  const en = locale === "en";

  try {
    const product = await getProduct(id);

    if (!product) {
      return {
        title: en ? "Product Not Found | SoulArt" : "პროდუქტი ვერ მოიძებნა | SoulArt",
        description: en
          ? "The requested product could not be found."
          : "მოთხოვნილი პროდუქტი ვერ მოიძებნა.",
      };
    }

    const name = en && product.nameEn ? product.nameEn : product.name;

    const categoryName = en
      ? product.subCategory?.nameEn ||
        product.category?.nameEn ||
        product.mainCategory?.nameEn ||
        product.subCategory?.name ||
        product.category?.name ||
        product.mainCategory?.name ||
        ""
      : product.subCategory?.name ||
        product.category?.name ||
        product.mainCategory?.name ||
        "";

    const title = `${name}${categoryName ? ` - ${categoryName}` : ""} | ${
      product.brand
    } | SoulArt`;

    // Locale-aware description with the product's own data.
    const descriptionParts: string[] = [];
    const baseDesc = en
      ? product.descriptionEn || product.description
      : product.description;
    if (baseDesc) descriptionParts.push(baseDesc.slice(0, 100));

    if (product.discountedPrice && product.discountedPrice < product.price) {
      descriptionParts.push(
        en
          ? `Price: ₾${product.discountedPrice} (${product.discountPercentage}% off)`
          : `ფასი: ₾${product.discountedPrice} (ფასდაკლება ${product.discountPercentage}%)`
      );
    } else if (product.price) {
      descriptionParts.push(en ? `Price: ₾${product.price}` : `ფასი: ₾${product.price}`);
    }

    if (product.dimensions) {
      const dims =
        typeof product.dimensions === "string"
          ? JSON.parse(product.dimensions)
          : product.dimensions;
      if (dims.width || dims.height) {
        const dimStr = `${dims.width || ""}x${dims.height || ""}${
          dims.depth ? `x${dims.depth}` : ""
        }`;
        descriptionParts.push(en ? `Size: ${dimStr} cm` : `ზომა: ${dimStr} სმ`);
      }
    }

    if (product.sizes?.length > 0) {
      descriptionParts.push(
        en ? `Sizes: ${product.sizes.join(", ")}` : `ზომები: ${product.sizes.join(", ")}`
      );
    }
    if (product.colors?.length > 0) {
      descriptionParts.push(
        en ? `Colors: ${product.colors.join(", ")}` : `ფერები: ${product.colors.join(", ")}`
      );
    }
    const mats =
      en && product.materialsEn?.length ? product.materialsEn : product.materials;
    if (mats?.length > 0) {
      descriptionParts.push(en ? `Material: ${mats.join(", ")}` : `მასალა: ${mats.join(", ")}`);
    }
    if (product.hashtags?.length > 0) {
      descriptionParts.push(product.hashtags.map((tag: string) => `#${tag}`).join(" "));
    }

    const description = descriptionParts.join(" | ").slice(0, 300);

    // Keywords scoped strictly to THIS product — no cross-listing data.
    const pageKeywords = collectProductKeywords(product);
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
    if (product.mainCategory?.name) extraKeywords.push(product.mainCategory.name);
    if (product.subCategory?.name) extraKeywords.push(product.subCategory.name);

    const keywords = mergeKeywordSets(extraKeywords, pageKeywords).slice(0, 25);

    const ogImage =
      product.images?.length > 0
        ? [{ url: product.images[0], width: 1200, height: 630, alt: name }]
        : [{ url: "/logo.png", width: 1200, height: 630, alt: "SoulArt" }];

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
        images: ogImage,
        type: "website",
        locale: en ? "en_US" : "ka_GE",
        alternateLocale: en ? "ka_GE" : "en_US",
        siteName: "SoulArt",
        url: en
          ? `https://soulart.ge${productHref(product)}?lang=en`
          : `https://soulart.ge${productHref(product)}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: product.images?.length > 0 ? [product.images[0]] : ["/logo.png"],
      },
      // Self-referential canonical per locale + ka/en hreflang alternates.
      alternates: buildLocaleAlternates(productHref(product), locale),
      other: {
        "product:price:amount":
          product.discountedPrice && product.discountedPrice < product.price
            ? product.discountedPrice
            : product.price,
        "product:price:currency": "GEL",
        // Same source of truth as the Buy button + JSON-LD (variant-aware).
        "product:availability": isInStock(product) ? "in stock" : "out of stock",
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

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = extractProductId(rawId);
  const product = await getProduct(id);

  // Proper HTTP 404 for missing/deleted products (avoids soft-404 in Google).
  if (!product || !product._id) {
    notFound();
  }

  // schema.org/Product structured data (crawler-facing; no UI impact).
  const effectivePrice =
    product.discountedPrice && product.discountedPrice < product.price
      ? product.discountedPrice
      : product.price;
  const productJsonLd = buildProductJsonLd({
    name: product.name,
    description: product.description,
    images: product.images,
    sku: product._id,
    brand: product.brand,
    price: effectivePrice,
    inStock: isInStock(product),
    url: `https://soulart.ge${productHref(product)}`,
  });

  return (
    <div className="Container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductPromoToast />
      <ProductDetails product={product} />
    </div>
  );
}
