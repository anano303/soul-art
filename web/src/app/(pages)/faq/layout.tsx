import { Metadata } from "next";
import { buildAlternates } from "@/lib/hreflang";

const title = "ხშირად დასმული კითხვები (FAQ) | SoulArt";
const description =
  "პასუხები ხშირ კითხვებზე SoulArt-ზე — შეკვეთა, მიტანა, გადახდა, დაბრუნება და გამყიდველად დარეგისტრირება.";

export const metadata: Metadata = {
  title,
  description,
  alternates: buildAlternates("/faq", "ka"),
  openGraph: {
    title,
    description,
    url: "https://soulart.ge/faq",
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

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
