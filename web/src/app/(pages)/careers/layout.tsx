import { Metadata } from "next";

export const metadata: Metadata = {
  title: "კარიერა | SoulArt - გაყიდვების მენეჯერი",
  description:
    "შემოუერთდი SoulArt-ის გუნდს! ვეძებთ გაყიდვების მენეჯერებს დისტანციური მუშაობით. მიიღე საკომისიო თითოეული გაყიდვიდან, თავისუფალი გრაფიკი, შეუზღუდავი შემოსავლის პოტენციალი.",
  keywords: [
    "კარიერა",
    "გაყიდვების მენეჯერი",
    "დისტანციური მუშაობა",
    "თავისუფალი გრაფიკი",
    "საკომისიო",
    "SoulArt",
    "ხელოვნება",
    "ვაკანსია",
    "სამუშაო",
  ],
  openGraph: {
    title: "🎯 გაყიდვების მენეჯერი - SoulArt",
    description:
      "დისტანციური მუშაობა | თავისუფალი გრაფიკი | საკომისიო შეთანხმებით. შემოუერთდი ჩვენს გუნდს და გამოიმუშავე ხელოვნების გაყიდვით!",
    url: "https://soulart.ge/careers",
    siteName: "SoulArt",
    locale: "ka_GE",
    type: "website",
    images: [
      {
        url: "https://soulart.ge/career.jpg",
        width: 1200,
        height: 630,
        alt: "SoulArt კარიერა - გაყიდვების მენეჯერი",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "🎯 გაყიდვების მენეჯერი - SoulArt",
    description:
      "დისტანციური მუშაობა | თავისუფალი გრაფიკი | საკომისიო შეთანხმებით. შემოუერთდი ჩვენს გუნდს!",
    images: ["https://soulart.ge/career.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://soulart.ge/careers",
  },
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
