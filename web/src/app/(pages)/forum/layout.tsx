import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ფორუმი - ხელოვანების თემატური სივრცე | SoulArt",
  description:
    "SoulArt ფორუმი - ქართველი ხელოვანებისა და ხელოვნების მოყვარულთა თემატური სივრცე. გაუზიარეთ თქვენი ნამუშევრები, მიიღეთ რჩევები და იპოვეთ თანამოაზრეები. ისაუბრეთ ნახატებზე, ხელნაკეთ ნივთებზე და ხელოვნებაზე.",
  keywords: [
    "ფორუმი",
    "ხელოვანების ფორუმი",
    "მხატვრების ფორუმი",
    "ხელოვნების ფორუმი",
    "ქართული ფორუმი",
    "ნახატები",
    "ხელნაკეთი ნივთები",
    "ხელოვნება",
    "დისკუსია",
    "თემატური სივრცე",
    "ხელოვანები",
    "მხატვრები",
    "ქართველი ხელოვანები",
    "forum",
    "art forum",
    "artists community",
    "Georgian artists",
    "SoulArt",
    "სოულარტი",
    "ხელნაკეთი",
    "handmade",
    "artwork",
    "paintings",
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
    title: "ფორუმი - ხელოვანების თემატური სივრცე | SoulArt",
    description:
      "ქართველი ხელოვანებისა და ხელოვნების მოყვარულთა თემატური სივრცე. გაუზიარეთ ნამუშევრები და იპოვეთ თანამოაზრეები.",
    url: "https://soulart.ge/forum",
    siteName: "SoulArt",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "SoulArt ფორუმი - ხელოვანების თემატური სივრცე",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ფორუმი - ხელოვანების თემატური სივრცე | SoulArt",
    description:
      "ქართველი ხელოვანებისა და ხელოვნების მოყვარულთა თემატური სივრცე. გაუზიარეთ ნამუშევრები და იპოვეთ თანამოაზრეები.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://soulart.ge/forum",
  },
};

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
