import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ბლოგი | Soulart - ხელოვნებისა და ხელოვანების შესახებ",
  description:
    " ქართველი ხელოვანები  - გაიგე მათი შემოქმედების ისტორიები, ინსპირაციები და გამოცდილება.",
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
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
