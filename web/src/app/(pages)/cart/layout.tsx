import { Metadata } from "next";

export const metadata: Metadata = {
  title: "კალათა - SoulArt | Shopping Cart",
  description:
    "თქვენი საყიდლების კალათა SoulArt-ში. დაათვალიერეთ შერჩეული პროდუქტები და განაგრძეთ შეძენა. Your shopping cart at SoulArt. Review selected products and proceed to checkout.",
  keywords: [
    "კალათა",
    "საყიდლები",
    "შეძენა",
    "შეკვეთა",
    "SoulArt",
    "მაიჰანტერი",
    "shopping cart",
    "cart",
    "purchase",
    "checkout",
    "order",
    "buy",
    "selected items",
  ],
  authors: [{ name: "SoulArt" }],
  creator: "SoulArt",
  publisher: "SoulArt",
  robots: {
    index: false, // კალათა private page-ია
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "კალათა - SoulArt | Shopping Cart",
    description:
      "თქვენი საყიდლების კალათა SoulArt-ში. დაათვალიერეთ შერჩეული პროდუქტები და განაგრძეთ შეძენა.",
    url: "https://SoulArt.ge/cart",
    siteName: "SoulArt",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "SoulArt კალათა",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "კალათა - SoulArt",
    description: "თქვენი საყიდლების კალათა SoulArt-ში.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://SoulArt.ge/cart",
  },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
