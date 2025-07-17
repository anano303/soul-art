import { Suspense } from "react";
import ShopContent from "./ShopContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "მაღაზია - ხელნაკეთი ნივთები და ნახატები | SoulArt",
  description:
    "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ მაღაზიაში. ქართველი ხელოვანების ნამუშევრები, ხელნაკეთი სამკაულები, აქსესუარები და დეკორი. ხარისხიანი ნივთები საუკეთესო ფასად საქართველოში. Shop unique handmade items and paintings.",
  keywords: [
    "მაღაზია",
    "ხელნაკეთი ნივთები",
    "ნახატები",
    "ქართველი მხატვრები",
    "SoulArt",
    "ხელნაკეთი სამკაულები",
    "ხელნაკეთი აქსესუარები",
    "დეკორი",
    "ხელოვნება",
    "shop",
    "handmade items",
    "paintings",
    "georgian artists",
    "handmade jewelry",
    "handmade accessories",
    "art",
    "decor",
    "Georgia",
    "unique art",
    "artisan crafts",
  ],
  authors: [{ name: "SoulArt" }],
  creator: "SoulArt",
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
    title: "მაღაზია - ხელნაკეთი ნივთები და ნახატები | SoulArt",
    description:
      "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ მაღაზიაში. ქართველი ხელოვანების ნამუშევრები, სამკაულები, აქსესუარები და დეკორი.",
    url: "https://soulart.ge/shop",
    siteName: "SoulArt",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "SoulArt მაღაზია - ხელნაკეთი ნივთები და ნახატები",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "მაღაზია - ხელნაკეთი ნივთები და ნახატები | SoulArt",
    description:
      "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ მაღაზიაში. ქართველი ხელოვანების ნამუშევრები.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://soulart.ge/shop",
  },
};

const ShopPage = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <ShopContent />
      </Suspense>
    </div>
  );
};

export default ShopPage;
