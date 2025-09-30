import { Metadata } from "next";

export const metadata: Metadata = {
  title: "პაროლის გადატვირთვა - ახალი პაროლის დაყენება | SoulArt",
  description:
    "დააყენე ახალი პაროლი შენი SoulArt ანგარიშისთვის. უსაფრთხო პაროლის აღდგენის პროცესი, რომელიც დაგეხმარება ანგარიშზე წვდომის აღდგენაში.",
  keywords: [
    "პაროლის გადატვირთვა",
    "ახალი პაროლი",
    "პაროლის შეცვლა",
    "ანგარიშის აღდგენა",
    "reset password",
    "new password",
    "change password",
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
    title: "პაროლის გადატვირთვა - ახალი პაროლის დაყენება",
    description:
      "დააყენე ახალი პაროლი შენი SoulArt ანგარიშისთვის და გააგრძელე უნიკალური ხელნაკეთი ნივთების შეძენა.",
    url: "https://soulart.ge/reset-password",
    siteName: "SoulArt",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "პაროლის გადატვირთვა SoulArt-ზე",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "პაროლის გადატვირთვა - ახალი პაროლის დაყენება",
    description:
      "დააყენე ახალი პაროლი შენი SoulArt ანგარიშისთვის და გააგრძელე უნიკალური ხელნაკეთი ნივთების შეძენა.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://soulart.ge/reset-password",
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
