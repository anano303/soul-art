import type { Metadata } from "next";
import { buildLocaleAlternates, resolveLocale } from "@/lib/hreflang";
import HomeContent from "./home-content";

// hreflang (ka/en/x-default) + self-canonical per locale. Title/description
// still come from the root layout; this only adds the locale alternates.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const { lang } = await searchParams;
  return { alternates: buildLocaleAlternates("/", resolveLocale(lang)) };
}

export default function Home() {
  return <HomeContent />;
}
