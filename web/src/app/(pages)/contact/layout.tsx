import { Metadata } from "next";

export const metadata: Metadata = {
  title: "კონტაქტი - დაგვიკავშირდი  | SoulArt",
  description:
    "დაგვიკავშირდი SoulArt. გაგვიზიარე შენი შეკითხვები, წინადადებები ან პრობლემები. ჩვენი გუნდი მზად არის დაგეხმაროს ხელნაკეთი ნივთებისა და ნახატების შეძენასთან დაკავშირებით.",
  keywords: [
    "კონტაქტი",
    "დაგვიკავშირდი",
    "დახმარება",
    "შეკითხვები",
    "წინადადებები",
    "მხარდაჭერა",
    "contact",
    "help",
    "support",
    "questions",
    "suggestions",
    "customer service",
    "SoulArt",
    "საქართველო",
    "Georgia",
    "ხელნაკეთი ნივთები",
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
    title: "კონტაქტი - დაგვიკავშირდი | SoulArt",
    description:
      "გაგვიზიარე შენი შეკითხვები და წინადადებები. ჩვენი გუნდი მზად არის დაგეხმაროს ხელნაკეთი ნივთებისა და ნახატების შეძენასთან დაკავშირებით.",
    url: "https://soulart.ge/contact",
    siteName: "SoulArt",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "კონტაქტი | SoulArt - დაგვიკავშირდი ხელნაკეთი ნივთებისა და ნახატების შესახებ",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "კონტაქტი - დაგვიკავშირდი | SoulArt",
    description:
      "გაგვიზიარე შენი შეკითხვები და წინადადებები. ჩვენი გუნდი მზად არის დაგეხმაროს ხელნაკეთი ნივთებისა და ნახატების შეძენასთან დაკავშირებით.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://soulart.ge/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
