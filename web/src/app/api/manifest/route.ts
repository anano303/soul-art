import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const theme = url.searchParams.get("theme") || "light";
  const isWhiteTheme = theme === "dark";

  const iconPath = isWhiteTheme
    ? "/soulart_icon_white_fullsizes.ico"
    : "/soulart_icon_blue_fullsizes.ico";
  const themeColor = isWhiteTheme ? "#ffffff" : "#012645";
  const backgroundColor = isWhiteTheme ? "#1a1a1a" : "#ffffff";

  const manifest = {
    name: "SoulArt - ხელნაკეთი ნივთები და ნახატები",
    short_name: "SoulArt",
    description:
      "SoulArt - ხელნაკეთი ნივთების, ნახატების და ხელოვნების ონლაინ მაღაზია. Handmade items, paintings and artworks online store.",
    start_url: "/",
    display: "standalone",
    background_color: backgroundColor,
    theme_color: themeColor,
    orientation: "portrait-primary",
    scope: "/",
    lang: "ka",
    categories: ["shopping", "lifestyle", "entertainment"],
    shortcuts: [
      {
        name: "მაღაზია",
        short_name: "Shop",
        description: "Browse handmade items and artworks",
        url: "/shop",
        icons: [{ src: iconPath, sizes: "96x96" }],
      },
      {
        name: "ფორუმი",
        short_name: "Forum",
        description: "Join art community discussions",
        url: "/forum",
        icons: [{ src: iconPath, sizes: "96x96" }],
      },
      {
        name: "კალათა",
        short_name: "Cart",
        description: "View your shopping cart",
        url: "/cart",
        icons: [{ src: iconPath, sizes: "96x96" }],
      },
    ],
    icons: [
      {
        src: iconPath,
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
      {
        src: iconPath,
        sizes: "72x72",
        type: "image/x-icon",
      },
      {
        src: iconPath,
        sizes: "96x96",
        type: "image/x-icon",
      },
      {
        src: iconPath,
        sizes: "144x144",
        type: "image/x-icon",
      },
      {
        src: iconPath,
        sizes: "192x192",
        type: "image/x-icon",
      },
      {
        src: iconPath,
        sizes: "256x256",
        type: "image/x-icon",
      },
      {
        src: iconPath,
        sizes: "512x512",
        type: "image/x-icon",
        purpose: "any maskable",
      },
    ],
    screenshots: [
      {
        src: "/logo.png",
        sizes: "1280x720",
        type: "image/png",
        platform: "wide",
        label: "SoulArt Homepage",
      },
      {
        src: "/logo.png",
        sizes: "720x1280",
        type: "image/png",
        platform: "narrow",
        label: "SoulArt Mobile View",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
