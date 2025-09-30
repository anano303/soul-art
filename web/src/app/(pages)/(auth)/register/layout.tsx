import { Metadata } from "next";

export const metadata: Metadata = {
  title: "დარეგისტრირდი SoulArt-ზე - შექმენი ანგარიში | SoulArt",
  description:
    "დარეგისტრირდი SoulArt-ზე და შექმენი შენი ანგარიში. იყიდე უნიკალური ხელნაკეთი ნივთები, ნახატები და ხელოვნების ნამუშევრები. უფასო რეგისტრაცია, უსაფრთხო გადახდები, სწრაფი მიწოდება.",
  keywords: [
    "რეგისტრაცია",
    "ანგარიშის შექმნა",
    "დარეგისტრირდი",
    "შექმენი ანგარიში",
    "ხელნაკეთი ნივთები",
    "ნახატების შეძენა",
    "ხელოვნების ნამუშევრები",
    "ონლაინ მაღაზია",
    "საქართველო",
    "registration",
    "create account",
    "sign up",
    "handmade items",
    "buy paintings",
    "artworks",
    "online store",
    "Georgia",
    "SoulArt",
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
    title: "დარეგისტრირდი SoulArt-ზე - შექმენი ანგარიში",
    description:
      "შექმენი შენი ანგარიში SoulArt-ზე და დაიწყე უნიკალური ხელნაკეთი ნივთებისა და ნახატების შეძენა.",
    url: "https://soulart.ge/register",
    siteName: "SoulArt",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "დარეგისტრირდი SoulArt-ზე - უნიკალური ხელნაკეთი ნივთები და ნახატები",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "დარეგისტრირდი SoulArt-ზე - შექმენი ანგარიში",
    description:
      "შექმენი შენი ანგარიში SoulArt-ზე და დაიწყე უნიკალური ხელნაკეთი ნივთებისა და ნახატების შეძენა.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://soulart.ge/register",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
