import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ჩვენს შესახებ | Soulart - About Us | Soulart",
  description:
    "გაიგე Soulart.ge-ს შესახებ - ქართული ონლაინ პლატფორმა ხელოვანებისა და ხელნაკეთი ნივთების მოყვარულებისთვის. ჩვენი ისტორია, მისია და ხედვა. Learn about Soulart.ge - a Georgian online platform for artists and art lovers.",
  keywords: [
    "ჩვენს შესახებ",
    "Soulart ისტორია",
    "ქართული პლატფორმა",
    "ხელოვანებისთვის",
    "ხელნაკეთი ნივთები",
    "მისია",
    "ხედვა",
    "ლევან ბეროშვილი",
    "ანი ბეროშვილი",
    "about us",
    "our story",
    "mission",
    "vision",
    "Georgian platform",
    "handmade",
    "artists platform",
    "Soulart founders",
    "Levan Beroshvili",
    "Ani Beroshvili",
    "Microsoft",
    "software engineer",
    "პროგრამული ინჟინერი",
  ],
  openGraph: {
    title: "ჩვენს შესახებ | Soulart - About Us",
    description:
      "გაიგე Soulart.ge-ს შესახებ - ქართული ონლაინ პლატფორმა ხელოვანებისა და ხელნაკეთი ნივთების მოყვარულებისთვის. ჩვენი ისტორია, დამფუძნებლები , მისია და ხედვა.",
    type: "website",
    url: "https://soulart.ge/about",
    siteName: "Soulart",
    locale: "ka_GE",
    alternateLocale: ["en_US"],
    images: [
      {
        url: "https://soulart.ge/van-gogh.jpg",
        width: 1200,
        height: 630,
        alt: "Soulart - ქართული პლატფორმა ხელოვანებისთვის",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@soulart_ge",
    title: "ჩვენს შესახებ | Soulart - About Us",
    description:
      "გაიგე Soulart.ge-ს შესახებ - ქართული ონლაინ პლატფორმა ხელოვანებისა და ხელნაკეთი ნივთების მოყვარულებისთვის.",
    images: ["https://soulart.ge/van-gogh.jpg"],
  },
  alternates: {
    canonical: "https://soulart.ge/about",
    languages: {
      "ka-GE": "https://soulart.ge/about",
      "en-US": "https://soulart.ge/about",
    },
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
