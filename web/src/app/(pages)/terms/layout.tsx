import { Metadata } from "next";
import { buildAlternates } from "@/lib/hreflang";

const title = "წესები და პირობები | SoulArt";
const description =
  "SoulArt.ge-ს ვებგვერდით სარგებლობის წესები და პირობები — შეკვეთა, გადახდა, მიტანა, დაბრუნება და მომხმარებლის უფლებები.";

export const metadata: Metadata = {
  title,
  description,
  alternates: buildAlternates("/terms", "ka"),
  openGraph: {
    title,
    description,
    url: "https://soulart.ge/terms",
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

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
