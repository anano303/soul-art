import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import ShopContent from "@/app/(pages)/shop/ShopContent";
import type { Product } from "@/types";
import { buildLocaleAlternates, resolveLocale } from "@/lib/hreflang";

// The two clean category roots. IDs are fixed/known; slugs are the URL segment.
export const MAIN_CATEGORIES: Record<
  string,
  { id: string; ka: string; en: string }
> = {
  paintings: {
    id: "68768f6f0b55154655a8e882",
    ka: "ნახატები",
    en: "Paintings",
  },
  handmade: {
    id: "68768f850b55154655a8e88f",
    ka: "ხელნაკეთი ნივთები",
    en: "Handmade items",
  },
};

type SubInfo = { id: string; name: string; nameEn?: string };

// Resolve a subcategory slug -> {id, name} within a parent category.
async function resolveSub(
  categoryId: string,
  subSlug: string,
): Promise<SubInfo | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/subcategories?categoryId=${categoryId}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const list: Array<{
      _id?: string;
      id?: string;
      name: string;
      nameEn?: string;
      slug?: string;
    }> = Array.isArray(data) ? data : data.items || data.subcategories || [];
    const match = list.find((s) => s.slug === subSlug);
    if (!match) return null;
    return {
      id: (match._id || match.id) as string,
      name: match.name,
      nameEn: match.nameEn,
    };
  } catch {
    return null;
  }
}

// First page of products for the category (ISR-cached; client re-fetches fresh).
async function fetchCategoryProducts(
  mainId: string,
  subId?: string,
): Promise<{ products: Product[]; totalPages: number }> {
  try {
    const qp = new URLSearchParams({
      page: "1",
      limit: "20",
      sortBy: "createdAt",
      sortDirection: "desc",
      excludeOutOfStock: "true",
      includeVariants: "true",
      mainCategory: mainId,
    });
    if (subId) qp.set("subCategory", subId);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products?${qp.toString()}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return { products: [], totalPages: 1 };
    const data = await res.json();
    const items: Product[] = data.items || data.products || [];
    const inStock = items.filter(
      (p) =>
        (p.countInStock ?? 0) > 0 ||
        (Array.isArray(p.variants) &&
          p.variants.some((v) => (v.stock ?? 0) > 0)),
    );
    return { products: inStock, totalPages: data.pages || 1 };
  } catch {
    return { products: [], totalPages: 1 };
  }
}

export async function categoryMetadata(
  mainSlug: string,
  slugParts: string[] | undefined,
  lang?: string,
): Promise<Metadata> {
  const main = MAIN_CATEGORIES[mainSlug];
  if (!main) return {};
  const locale = resolveLocale(lang);
  const en = locale === "en";
  const subSlug = slugParts?.[0];

  let name = en ? main.en : main.ka;
  let path = `/${mainSlug}`;
  let allowIndex = true;

  if (subSlug) {
    const sub = await resolveSub(main.id, subSlug);
    if (!sub) {
      // Unknown sub slug — page will 404; keep it out of the index.
      allowIndex = false;
    } else {
      name = en ? sub.nameEn || sub.name : sub.name;
      path = `/${mainSlug}/${subSlug}`;
    }
  }

  const title = `${name} | SoulArt`;
  const description = en
    ? `Browse ${name} on SoulArt — original works and handmade items by Georgian artists at the best prices in Georgia.`
    : `${name} — SoulArt-ზე ქართველი ხელოვანების ორიგინალი ნამუშევრები და ხელნაკეთი ნივთები საუკეთესო ფასად.`;
  const alt = buildLocaleAlternates(path, locale);

  return {
    title,
    description,
    robots: {
      index: allowIndex,
      follow: true,
      googleBot: {
        index: allowIndex,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: alt,
    openGraph: {
      title,
      description,
      url: alt.canonical,
      siteName: "SoulArt",
      type: "website",
      locale: en ? "en_US" : "ka_GE",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export async function CategoryRoutePage({
  mainSlug,
  slugParts,
}: {
  mainSlug: string;
  slugParts?: string[];
}) {
  const main = MAIN_CATEGORIES[mainSlug];
  if (!main) notFound();

  const subSlug = slugParts?.[0];
  let subId: string | undefined;
  if (subSlug) {
    const sub = await resolveSub(main.id, subSlug);
    if (!sub) notFound(); // unknown subcategory slug → real 404
    subId = sub.id;
  }

  const { products, totalPages } = await fetchCategoryProducts(main.id, subId);

  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <ShopContent
          initialProducts={products}
          initialTotalPages={totalPages}
          initialMainCategory={main.id}
          initialSubCategoryId={subId || ""}
          categoryMode
        />
      </Suspense>
    </div>
  );
}
