import { Suspense } from "react";
import ShopContent from "./ShopContent";
import { Metadata } from "next";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import {
  GLOBAL_KEYWORDS,
  extractKeywordsFromText,
  mergeKeywordSets,
  sanitizeKeyword,
} from "@/lib/seo-keywords";
import { buildAlternates, resolveLocale } from "@/lib/hreflang";

type ShopProduct = {
  name?: string | null;
  nameEn?: string | null;
  brand?: string | null;
  brandLogo?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  summary?: string | null;
  summaryEn?: string | null;
  category?: string | { name?: string | null; title?: string | null } | null;
  subCategory?: string | { name?: string | null; title?: string | null } | null;
  mainCategory?:
    | string
    | { name?: string | null; title?: string | null }
    | null;
  hashtags?: string[] | null;
  materials?: string[] | null;
  colors?: string[] | null;
  sizes?: string[] | null;
  images?: string[] | null;
  user?: {
    name?: string | null;
    storeName?: string | null;
  } | null;
};

const collectShopKeywords = (options: {
  brand?: string;
  authorInfo?: string;
  product?: ShopProduct | null;
  title?: string;
  description?: string;
}): string[] => {
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

  const registerArray = (values?: string[] | null) => {
    values?.forEach(register);
  };

  const registerCategory = (
    category?: ShopProduct["category"] | ShopProduct["subCategory"]
  ) => {
    if (!category) {
      return;
    }

    if (typeof category === "string") {
      register(category);
      return;
    }

    register(category.name ?? category.title ?? undefined);
  };

  register(options.brand);
  registerText(options.brand);
  register(options.authorInfo);
  registerText(options.title);
  registerText(options.description);

  const product = options.product;
  if (product) {
    register(product.name);
    register(product.nameEn);
    register(product.brand);
    registerText(product.description);
    registerText(product.descriptionEn);
    registerText(product.summary);
    registerText(product.summaryEn);

    registerCategory(product.category);
    registerCategory(product.subCategory);
    registerCategory(product.mainCategory);

    registerArray(product.hashtags ?? []);
    registerArray(product.materials ?? []);
    registerArray(product.colors ?? []);
    registerArray(product.sizes ?? []);
  }

  return Array.from(keywordMap.values());
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  try {
    // Await searchParams as it's now a Promise in Next.js 15+
    const params = await searchParams;

    // Get brand from search params
    const brand = typeof params?.brand === "string" ? params.brand : "";
    const locale = resolveLocale(params?.lang);

    let apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/products?page=1&limit=1&sort=createdAt&direction=desc&populate=user&populate=images`;
    if (brand) {
      apiUrl += `&brand=${encodeURIComponent(brand)}`;
    }

    // Fetch the most recent product (or most recent from specific brand) to use as representative image
    const response = await fetch(apiUrl, {
      cache: "no-store",
    });

    let representativeImage = "/logo.png"; // fallback to logo
    let authorInfo = brand || "SoulArt"; // Use brand as default author for brand pages
    let title =
      locale === "en"
        ? "Handmade items & paintings — Georgia's first online art platform | SoulArt"
        : "პირველი პლატფორმა საქართველოში - ხელნაკეთი ნივთები და ნახატები | SoulArt";
    let description =
      locale === "en"
        ? "Shop unique handmade items and original paintings by Georgian artists on SoulArt — accessories, décor and gifts at the best prices in Georgia."
        : "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ პლატფორმაზე. ქართველი ხელოვანების ნამუშევრები, ხელნაკეთი ნივთები, აქსესუარები და დეკორი. ხარისხიანი ნივთები საუკეთესო ფასად საქართველოში.";
    let latestProduct: ShopProduct | null = null;

    if (response.ok) {
      const data = await response.json();
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.products)
        ? data.products
        : Array.isArray(data)
        ? data
        : [];
      if (items.length > 0) {
        latestProduct = items[0];

        // For brand pages, use the populated user information
        if (brand && latestProduct?.user) {
          authorInfo =
            latestProduct.user.name || latestProduct.user.storeName || brand;
        }

        // Use brandLogo as primary representative image for brand pages, fallback to product image
        if (latestProduct?.brandLogo) {
          representativeImage = latestProduct.brandLogo;
        } else if (latestProduct?.images && latestProduct.images.length > 0) {
          const imageUrl = latestProduct.images[0];
          // Ensure the image URL is absolute for OpenGraph
          representativeImage = imageUrl.startsWith("http")
            ? imageUrl
            : `https://soulart.ge${imageUrl}`;
        }
      }
    }

    // Update title and description to include brand/author info (outside API check)
    if (brand) {
      title = `${authorInfo}'s Art Shop | SoulArt`;
      description =
        locale === "en"
          ? `Shop ${authorInfo}'s unique artworks on SoulArt — original Georgian art, paintings and handmade items.`
          : `შეიძინეთ ${authorInfo}-ის უნიკალური ნამუშევრები SoulArt-ის ონლაინ პლატფორმაზე. ქართველი ხელოვანების ნამუშევრები, ნახატები, ხელნაკეთი ნივთები.`;
    }

    const pageKeywords = collectShopKeywords({
      brand,
      authorInfo,
      product: latestProduct,
      title,
      description,
    });

    // Shop is the catalog landing page: representative product + site-wide
    // brand terms only (no per-other-listing dumps).
    const keywords = mergeKeywordSets(pageKeywords, GLOBAL_KEYWORDS).slice(0, 30);

    return {
      title,
      description,
      keywords: keywords.length ? keywords : undefined,
      authors: [{ name: authorInfo }],
      creator: authorInfo,
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
        url: brand
          ? `https://soulart.ge/shop?brand=${encodeURIComponent(brand)}`
          : "https://soulart.ge/shop",
        siteName: "SoulArt",
        images: [
          {
            url: representativeImage,
            width: 1200,
            height: 630,
            alt: brand
              ? `${authorInfo}'s Art Collection - SoulArt`
              : "SoulArt პლატფორმა - ხელნაკეთი ნივთები და ნახატები",
          },
        ],
        locale: "ka_GE",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [representativeImage],
      },
      alternates: buildAlternates(
        brand ? `/shop?brand=${encodeURIComponent(brand)}` : "/shop",
        locale
      ),
    };
  } catch (error) {
    console.error("Error generating shop metadata:", error);
    // Fallback metadata
    return {
      title: "პლატფორმა - ხელნაკეთი ნივთები და ნახატები | SoulArt",
      description:
        "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ პლატფორმაზე.",
      openGraph: {
        title: "პლატფორმა - ხელნაკეთი ნივთები და ნახატები | SoulArt",
        description:
          "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ პლატფორმაზე.",
        images: [
          {
            url: "/logo.png",
            width: 1200,
            height: 630,
            alt: "SoulArt პლატფორმა",
          },
        ],
        locale: "ka_GE",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "პლატფორმა - ხელნაკეთი ნივთები და ნახატები | SoulArt",
        description:
          "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ პლატფორმაზე.",
        images: ["/logo.png"],
      },
    };
  }
}

// Server-side fetch of the first page so real product cards ship in the initial
// HTML (getProducts() is client-only via fetchWithAuth, so we fetch directly here).
async function getInitialShopProducts(sp: {
  [key: string]: string | string[] | undefined;
}): Promise<{ products: Product[]; totalPages: number }> {
  try {
    const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
    const qp = new URLSearchParams();
    qp.set("page", get("page") || "1");
    qp.set("limit", "20");
    qp.set("sortBy", get("sortBy") || "createdAt");
    qp.set("sortDirection", get("sortDirection") || "desc");
    qp.set("excludeOutOfStock", "true");
    qp.set("includeVariants", "true");

    for (const k of ["mainCategory", "subCategory", "ageGroup", "size", "color"]) {
      const v = get(k);
      if (v) qp.set(k, v);
    }
    const brand = get("brand");
    if (brand) {
      try {
        qp.set("brand", decodeURIComponent(brand));
      } catch {
        qp.set("brand", brand);
      }
    }
    const keyword = get("keyword");
    if (keyword) qp.set("keyword", keyword);
    if (get("discountOnly") === "true") qp.set("discounted", "true");
    if (get("promo") === "true") qp.set("hasPromo", "true");
    const min = get("minPrice");
    let max = get("maxPrice");
    // Premium deep-links (e.g. PremiumRail) pass only minPrice; if a stale/odd
    // max ends up below min it's an impossible range, so drop the upper cap.
    if (min && max && Number(min) > Number(max)) {
      max = "";
    }
    if ((min && min !== "0") || (max && max !== "1000")) {
      if (min) qp.set("minPrice", min);
      if (max) qp.set("maxPrice", max);
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products?${qp.toString()}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { products: [], totalPages: 1 };
    const data = await res.json();
    const items: Product[] = data.items || data.products || [];
    const inStock = items.filter(
      (p) =>
        (p.countInStock ?? 0) > 0 ||
        (Array.isArray(p.variants) && p.variants.some((v) => (v.stock ?? 0) > 0))
    );
    return { products: inStock, totalPages: data.pages || 1 };
  } catch {
    return { products: [], totalPages: 1 };
  }
}

const ShopPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const sp = await searchParams;
  const { products, totalPages } = await getInitialShopProducts(sp);
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <ShopContent
          initialProducts={products}
          initialTotalPages={totalPages}
        />
      </Suspense>
    </div>
  );
};

export default ShopPage;
