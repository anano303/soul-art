import { Metadata } from "next";

export const metadata: Metadata = {
  title: "გახდი SoulArt-ის ნაწილი - დაიწყე გაყიდვა SoulArt-ზე | SoulArt",
  description:
    "შექმენი შენი ონლაინ მაღაზია SoulArt-ზე. გაყიდე შენი ნახატები, ხელნაკეთი ნივთები და ხელოვნების ნამუშევრები. უფასო რეგისტრაცია, მარტივი მართვა, ფართო აუდიტორია.",
  keywords: [
    "გახდი გამყიდველი",
    "დაიწყე გაყიდვა",
    "ონლაინ მაღაზია",
    "ხელოვნების გაყიდვა",
    "ნახატების გაყიდვა",
    "ხელნაკეთი ნივთების გაყიდვა",
    "სელერი",
    "გამყიდველი",
    "ხელოვანი",
    "მხატვარი",
    "არტისტი",
    "become seller",
    "start selling",
    "online store",
    "sell art",
    "sell paintings",
    "sell handmade",
    "artist",
    "SoulArt",
    "საქართველო",
    "Georgia",
    "ხელნაკეთი",
    "ნახატები",
    "ხელოვნება",
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
    title: "გახდი გამყიდველი - დაიწყე გაყიდვა SoulArt-ზე",
    description:
      "შექმენი შენი ონლაინ მაღაზია SoulArt-ზე. გაყიდე შენი ნახატები და ხელნაკეთი ნივთები ფართო აუდიტორიასთან.",
    url: "https://soulart.ge/sellers-register",
    siteName: "SoulArt",
    images: [
      {
        url: "/seller.jpg",
        width: 1200,
        height: 630,
        alt: "გახდი გამყიდველი SoulArt-ზე - დაიწყე გაყიდვა შენი ნახატებისა და ხელნაკეთი ნივთების",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "გახდი გამყიდველი - დაიწყე გაყიდვა SoulArt-ზე",
    description:
      "შექმენი შენი ონლაინ მაღაზია SoulArt-ზე. გაყიდე შენი ნახატები და ხელნაკეთი ნივთები.",
    images: ["/seller.jpg"],
  },
  alternates: {
    canonical: "https://soulart.ge/sellers-register",
  },
};

export default function SellersRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
