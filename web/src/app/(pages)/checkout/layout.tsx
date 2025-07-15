import { Metadata } from "next";

export const metadata: Metadata = {
  title: "გადახდა | მონადირე - Checkout | My Hunter",
  description:
    "უსაფრთხო გადახდა მონადირეობის აღჭურვილობისთვის. ონლაინ შეკვეთის დასრულება. Secure checkout for hunting equipment. Complete your online order.",
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
    "hunting equipment checkout",
    "buy hunting gear",
    "მონადირეობის აღჭურვილობის შეძენა",
    "ონლაინ მაღაზია",
    "e-commerce checkout",
  ],
  openGraph: {
    title: "გადახდა | მონადირე - Checkout | My Hunter",
    description:
      "უსაფრთხო გადახდა მონადირეობის აღჭურვილობისთვის. ონლაინ შეკვეთის დასრულება",
    type: "website",
    url: "/checkout",
    siteName: "მონადირე - My Hunter",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "მონადირე - My Hunter Checkout",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "გადახდა | მონადირე - Checkout | My Hunter",
    description:
      "უსაფრთხო გადახდა მონადირეობის აღჭურვილობისთვის. ონლაინ შეკვეთის დასრულება",
    images: ["/logo.png"],
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
