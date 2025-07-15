import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://soulart.ge";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/profile/",
          "/checkout/",
          "/cart/",
          "/api/",
          "/_next/",
          "/login/",
          "/register/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/admin/",
          "/profile/",
          "/checkout/",
          "/cart/",
          "/api/",
          "/_next/",
          "/login/",
          "/register/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
