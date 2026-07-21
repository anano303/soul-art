import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.soulart.ge";

  return {
    rules: [
      {
        userAgent: "*",
        // NOTE: do NOT block /_next/ — Google needs /_next/static (JS/CSS to
        // render client pages) and /_next/image (optimized product images for
        // Google Images). Blocking it hides images + JS-rendered content.
        // login/register are NOT blocked here — they use a noindex meta tag
        // instead (crawlable so Google sees the noindex and drops them, rather
        // than listing a bare titleless URL).
        allow: ["/", "/_next/static/", "/_next/image"],
        disallow: ["/admin/", "/profile/", "/checkout/", "/cart/", "/api/"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/_next/static/", "/_next/image"],
        disallow: ["/admin/", "/profile/", "/checkout/", "/cart/", "/api/"],
      },
    ],
    // Host: directive removed — legacy Yandex-only, ignored by Google.
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
