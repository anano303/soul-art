import { Metadata } from "next";

export const metadata: Metadata = {
  title: "შეკვეთები | Soulart - Orders | Soulart",
  description:
    "თქვენი შეკვეთების მდგომარეობა და დეტალები. ხელნაკეთი ნივთებისა და ნახატების შეკვეთების ისტორია. Your order status and details. Handmade items and paintings order history.",
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
    "handmade items orders",
    "paintings orders",
    "my orders",
    "ხელნაკეთი ნივთების შეკვეთები",
    "ნახატების შეკვეთები",
    "შეკვეთის ტრეკინგი",
    "delivery status",
    "მიწოდების სტატუსი",
  ],
  openGraph: {
    title: "შეკვეთები | Soulart - Orders | Soulart",
    description:
      "თქვენი შეკვეთების მდგომარეობა და დეტალები. ხელნაკეთი ნივთებისა და ნახატების შეკვეთების ისტორია",
    type: "website",
    url: "/orders",
    siteName: "Soulart",
    images: [
      {
        url: "/van gog.jpg",
        width: 1200,
        height: 630,
        alt: "Soulart Orders",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "შეკვეთები | Soulart - Orders | Soulart",
    description:
      "თქვენი შეკვეთების მდგომარეობა და დეტალები. ხელნაკეთი ნივთებისა და ნახატების შეკვეთების ისტორია",
    images: ["/van gog.jpg"],
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
