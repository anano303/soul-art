import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://soulart.ge";

  return {
    rules: [
      {
        userAgent: "*",
        // NOTE: do NOT block /_next/ — Google needs /_next/static (JS/CSS to
        // render client pages) and /_next/image (optimized product images for
        // Google Images). Blocking it hides images + JS-rendered content.
        allow: ["/", "/_next/static/", "/_next/image"],
        disallow: [
          "/admin/",
          "/profile/",
          "/checkout/",
          "/cart/",
          "/api/",
          "/login/",
          "/register/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/_next/static/", "/_next/image"],
        disallow: [
          "/admin/",
          "/profile/",
          "/checkout/",
          "/cart/",
          "/api/",
          "/login/",
          "/register/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
