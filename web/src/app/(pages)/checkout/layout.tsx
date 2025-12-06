import { Metadata } from "next";

export const metadata: Metadata = {
  title: "გადახდა | Soulart - Checkout | Soulart",
  description:
    "უსაფრთხო გადახდა ხელნაკეთი ნივთებისა და ნახატებისთვის. ონლაინ შეკვეთის დასრულება. Secure checkout for handmade items and paintings. Complete your online order.",
  keywords: [
    "გადახდა",
    "შეკვეთა",
    "ონლაინ შეკვეთა",
    "უსაფრთხო გადახდა",
    "შეკვეთის დასრულება",
    "checkout",
    "payment",
    "online order",
    "secure payment",
    "order completion",
    "handmade items checkout",
    "buy artworks",
    "ხელნაკეთი ნივთების შეძენა",
    "ნახატების შეძენა",
    "ონლაინ მაღაზია",
    "e-commerce checkout",
  ],
  openGraph: {
    title: "გადახდა | Soulart - Checkout | Soulart",
    description:
      "უსაფრთხო გადახდა ხელნაკეთი ნივთებისა და ნახატებისთვის. ონლაინ შეკვეთის დასრულება",
    type: "website",
    url: "/checkout",
    siteName: "Soulart",
    images: [
      {
        url: "/van-gogh.webp",
        width: 1200,
        height: 630,
        alt: "Soulart Checkout",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "გადახდა | Soulart - Checkout | Soulart",
    description:
      "უსაფრთხო გადახდა ხელნაკეთი ნივთებისა და ნახატებისთვის. ონლაინ შეკვეთის დასრულება",
    images: ["/van-gogh.webp"],
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  alternates: {
    canonical: "/checkout",
  },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
