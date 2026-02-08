import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://soulart.ge";

export const metadata: Metadata = {
  title: "ხელოვნების აუქციონები | SoulArt - ქართული ხელოვნების მარკეტფლეისი",
  description: `🎨 იყიდეთ უნიკალური ხელოვნების ნიმუშები SoulArt აუქციონზე! ორიგინალი ნახატები, რეპროდუქციები და თანამედროვე ქართველი მხატვრების ნამუშევრები. დადეთ ბიდი და გახდით უნიკალური ნამუშევრის მფლობელი.`,
  keywords: [
    "აუქციონი",
    "ხელოვნება",
    "ნახატი",
    "ხელოვნების აუქციონი",
    "ნახატების აუქციონი",
    "ნახატები",
    "მხატვრობა",
    "SoulArt",
    "ქართული ხელოვნება",
    "Georgian art auction",
    "art auction",
    "online auction",
    "buy art online",
    "original artwork",
    "contemporary art",
    "კონტემპორარული ხელოვნება",
    "თანამედროვე მხატვრობა",
    "ქართველი მხატვრები",
    "Georgian artists",
    "art marketplace",
    "ხელოვნების მარკეტი",
    "ნახატების გაყიდვა",
    "art bidding",
    "ფსონი",
    "ბიდი",
  ].join(", "),
  authors: [{ name: "SoulArt" }],
  creator: "SoulArt",
  publisher: "SoulArt",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: `${siteUrl}/auctions`,
    languages: {
      "ka-GE": `${siteUrl}/auctions`,
      "en-US": `${siteUrl}/en/auctions`,
    },
  },
  openGraph: {
    type: "website",
    locale: "ka_GE",
    url: `${siteUrl}/auctions`,
    siteName: "SoulArt - ქართული ხელოვნების მარკეტფლეისი",
    title: "🎨 ხელოვნების აუქციონები | SoulArt",
    description:
      "იყიდეთ უნიკალური ხელოვნების ნიმუშები აუქციონზე! ორიგინალი ნახატები, რეპროდუქციები და თანამედროვე ქართველი მხატვრების ნამუშევრები.",
    images: [
      {
        url: `${siteUrl}/images/auction-og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "SoulArt აუქციონები - ხელოვნების ონლაინ აუქციონი",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@soulart_ge",
    creator: "@soulart_ge",
    title: "🎨 ხელოვნების აუქციონები | SoulArt",
    description:
      "იყიდეთ უნიკალური ხელოვნების ნიმუშები აუქციონზე! ორიგინალი ნახატები და თანამედროვე ქართველი მხატვრების ნამუშევრები.",
    images: [`${siteUrl}/images/auction-og-image.jpg`],
  },
  other: {
    "fb:app_id": process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "",
    "pinterest-rich-pin": "true",
  },
};

export default function AuctionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
