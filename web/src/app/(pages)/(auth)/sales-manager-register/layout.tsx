import { Metadata } from "next";

export const metadata: Metadata = {
  title: "გახდი SoulArt-ის პარტნიორი - შემოსავალი ინფლუენსერებისთვის | SoulArt",
  description:
    "გახდი SoulArt-ის სეილს მენეჯერი და დაიწყე შემოსავლის მიღება. გაუზიარე SoulArt-ის პროდუქტები შენს აუდიტორიას და მიიღე საკომისიო ყოველი გაყიდვიდან.",
  keywords: [
    "სეილს მენეჯერი",
    "ინფლუენსერი",
    "პარტნიორობა",
    "შემოსავალი",
    "საკომისიო",
    "აფილიატე",
    "გაზიარება",
    "SoulArt პარტნიორი",
    "sales manager",
    "influencer",
    "affiliate",
    "partnership",
    "earn money",
    "commission",
    "SoulArt",
    "საქართველო",
    "Georgia",
  ],
  authors: [{ name: "SoulArt" }],
  creator: "SoulArt",
  publisher: "SoulArt",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "გახდი SoulArt-ის პარტნიორი - შემოსავალი ინფლუენსერებისთვის",
    description:
      "გაუზიარე SoulArt-ის პროდუქტები შენს აუდიტორიას და მიიღე საკომისიო ყოველი გაყიდვიდან. უფასო რეგისტრაცია!",
    url: "https://soulart.ge/sales-manager-register",
    siteName: "SoulArt",
    images: [
      {
        url: "/sales-manager.png",
        width: 1200,
        height: 630,
        alt: "გახდი SoulArt-ის სეილს მენეჯერი - დაიწყე შემოსავლის მიღება",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "გახდი SoulArt-ის პარტნიორი - შემოსავალი ინფლუენსერებისთვის",
    description:
      "გაუზიარე SoulArt-ის პროდუქტები შენს აუდიტორიას და მიიღე საკომისიო ყოველი გაყიდვიდან.",
    images: ["/sales-manager.png"],
  },
  alternates: {
    canonical: "https://soulart.ge/sales-manager-register",
  },
};

export default function SalesManagerRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
