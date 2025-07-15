import { Metadata } from "next";

export const metadata: Metadata = {
  title: "შეკვეთები | მონადირე - Orders | My Hunter",
  description:
    "თქვენი შეკვეთების მდგომარეობა და დეტალები. მონადირეობის აღჭურვილობის შეკვეთების ისტორია. Your order status and details. Hunting equipment order history.",
  keywords: [
    "შეკვეთები",
    "შეკვეთის მდგომარეობა",
    "შეკვეთის დეტალები",
    "შეკვეთების ისტორია",
    "orders",
    "order status",
    "order details",
    "order history",
    "order tracking",
    "hunting equipment orders",
    "my orders",
    "მონადირეობის აღჭურვილობის შეკვეთები",
    "შეკვეთის ტრეკინგი",
    "delivery status",
    "მიწოდების სტატუსი",
  ],
  openGraph: {
    title: "შეკვეთები | მონადირე - Orders | My Hunter",
    description:
      "თქვენი შეკვეთების მდგომარეობა და დეტალები. მონადირეობის აღჭურვილობის შეკვეთების ისტორია",
    type: "website",
    url: "/orders",
    siteName: "მონადირე - My Hunter",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "მონადირე - My Hunter Orders",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "შეკვეთები | მონადირე - Orders | My Hunter",
    description:
      "თქვენი შეკვეთების მდგომარეობა და დეტალები. მონადირეობის აღჭურვილობის შეკვეთების ისტორია",
    images: ["/logo.png"],
  },
  robots: {
    index: false,
    follow: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  alternates: {
    canonical: "/orders",
  },
};

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
