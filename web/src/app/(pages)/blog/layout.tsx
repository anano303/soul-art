import { Metadata } from "next";
import { buildAlternates } from "@/lib/hreflang";

const title = "ბლოგი | Soulart - ხელოვნებისა და ხელოვანების შესახებ";
const description =
  "ქართველი ხელოვანები - გაიგე მათი შემოქმედების ისტორიები, ინსპირაციები და გამოცდილება.";

export const metadata: Metadata = {
  title,
  description,
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
  // Without this, og:title/description fell back to the root layout (home's),
  // so the blog shared home's preview on social.
  alternates: buildAlternates("/blog", "ka"),
  openGraph: {
    title,
    description,
    url: "https://soulart.ge/blog",
    siteName: "SoulArt",
    locale: "ka_GE",
    type: "website",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "SoulArt" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/logo.png"],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
