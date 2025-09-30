import { Metadata } from "next";

export const metadata: Metadata = {
  title: "დაგავიწყდა პაროლი? - აღადგინე SoulArt ანგარიში | SoulArt",
  description:
    "დაგავიწყდა პაროლი? აღადგინე შენი SoulArt ანგარიში მარტივად. მიიღე პაროლის აღდგენის ინსტრუქცია ელექტრონულ ფოსტაზე და გააგრძელე უნიკალური ხელნაკეთი ნივთების შეძენა.",
  keywords: [
    "დაგავიწყდა პაროლი",
    "პაროლის აღდგენა",
    "ანგარიშის აღდგენა",
    "პაროლის გადატვირთვა",
    "forgot password",
    "password recovery",
    "reset password",
    "account recovery",
    "SoulArt",
    "საქართველო",
    "Georgia",
  ],
  authors: [{ name: "SoulArt" }],
  creator: "SoulArt",
  publisher: "SoulArt",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "დაგავიწყდა პაროლი? - აღადგინე SoulArt ანგარიში",
    description:
      "აღადგინე შენი SoulArt ანგარიში მარტივად და გააგრძელე უნიკალური ხელნაკეთი ნივთების შეძენა.",
    url: "https://soulart.ge/forgot-password",
    siteName: "SoulArt",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "პაროლის აღდგენა SoulArt-ზე",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "დაგავიწყდა პაროლი? - აღადგინე SoulArt ანგარიში",
    description:
      "აღადგინე შენი SoulArt ანგარიში მარტივად და გააგრძელე უნიკალური ხელნაკეთი ნივთების შეძენა.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://soulart.ge/forgot-password",
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
