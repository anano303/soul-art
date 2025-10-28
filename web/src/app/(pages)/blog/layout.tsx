import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ბლოგი | Soulart - ქართველი ხელოვანების ინტერვიუები",
  description:
    "ინტერვიუები ქართველ ხელოვანებთან - გაიგე მათი შემოქმედების ისტორიები, ინსპირაციები და გამოცდილება. Interviews with Georgian artists.",
  keywords: [
    "ბლოგი",
    "ინტერვიუები",
    "ქართველი ხელოვანები",
    "ხელოვანების ისტორიები",
    "შემოქმედება",
    "ხელნაკეთი",
    "blog",
    "interviews",
    "Georgian artists",
    "artist stories",
    "handmade",
    "creativity",
  ],
  openGraph: {
    title: "ბლოგი | Soulart - ქართველი ხელოვანების ინტერვიუები",
    description:
      "ინტერვიუები ქართველ ხელოვანებთან - გაიგე მათი შემოქმედების ისტორიები, ინსპირაციები და გამოცდილება.",
    type: "website",
    url: "https://soulart.ge/blog",
    siteName: "Soulart",
    locale: "ka_GE",
    images: [
      {
        url: "https://soulart.ge/van-gogh.jpg",
        width: 1200,
        height: 630,
        alt: "Soulart ბლოგი",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ბლოგი | Soulart - ქართველი ხელოვანების ინტერვიუები",
    description:
      "ინტერვიუები ქართველ ხელოვანებთან - გაიგე მათი შემოქმედების ისტორიები.",
    images: ["https://soulart.ge/van-gogh.jpg"],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
