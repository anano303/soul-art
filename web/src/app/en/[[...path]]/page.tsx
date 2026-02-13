import { redirect } from "next/navigation";

/**
 * Catch-all route for /en and /en/... paths.
 * Redirects to the equivalent path without /en prefix,
 * adding ?lang=en so LanguageContext switches to English.
 *
 * Examples:
 *   /en           → /?lang=en
 *   /en/products  → /products?lang=en
 *   /en/about     → /about?lang=en
 *   /en/products/abc123 → /products/abc123?lang=en
 */
export default async function EnglishRedirectPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const targetPath = path ? `/${path.join("/")}` : "/";
  redirect(`${targetPath}?lang=en`);
}
