import { Metadata } from "next";

// Login is an auth page — kept out of the search index (crawlable so Google
// sees the noindex and drops the URL, rather than listing a bare titleless
// link). The page itself is a client component, so noindex lives here.
export const metadata: Metadata = {
  title: "შესვლა | SoulArt",
  description: "შედი შენს SoulArt ანგარიშზე.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  alternates: {
    canonical: "https://www.soulart.ge/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
