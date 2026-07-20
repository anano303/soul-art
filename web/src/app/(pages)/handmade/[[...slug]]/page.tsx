import type { Metadata } from "next";
import {
  CategoryRoutePage,
  categoryMetadata,
} from "@/modules/categories/category-page";

// ISR — regenerated hourly; the client grid re-fetches fresh on mount.
export const revalidate = 3600;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  return categoryMetadata(
    "handmade",
    slug,
    Array.isArray(lang) ? lang[0] : lang,
  );
}

export default async function HandmadePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  return <CategoryRoutePage mainSlug="handmade" slugParts={slug} />;
}
