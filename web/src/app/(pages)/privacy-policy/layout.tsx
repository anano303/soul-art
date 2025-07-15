import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "კონფიდენციალურობის პოლიტიკა - SoulArt | Privacy Policy",
  description:
    "გაეცანით SoulArt-ის კონფიდენციალურობის პოლიტიკას. როგორ ვიყენებთ და ვიცავთ თქვენს პირად ინფორმაციას. GDPR შესაბამისი მონაცემთა დაცვის პოლიტიკა. ხელნაკეთი ნაწარმოებისა და ნახატების მარკეტპლეისი.",
  keywords: [
    "კონფიდენციალურობის პოლიტიკა",
    "მონაცემთა დაცვა",
    "პირადი ინფორმაცია",
    "უსაფრთხოება",
    "GDPR",
    "SoulArt",
    "სოულარტი",
    "ხელნაკეთი",
    "ნახატები",
    "privacy policy",
    "data protection",
    "personal information",
    "security",
    "privacy",
    "handmade",
    "artwork",
    "paintings",
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
    title: "კონფიდენციალურობის პოლიტიკა - SoulArt | Privacy Policy",
    description:
      "გაეცანით SoulArt-ის კონფიდენციალურობის პოლიტიკას. როგორ ვიყენებთ და ვიცავთ თქვენს პირად ინფორმაციას. ხელნაკეთი ნაწარმოებისა და ნახატების მარკეტპლეისი.",
    url: "https://soulart.ge/privacy-policy",
    siteName: "SoulArt",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "SoulArt კონფიდენციალურობის პოლიტიკა",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "კონფიდენციალურობის პოლიტიკა - SoulArt",
    description:
      "გაეცანით SoulArt-ის კონფიდენციალურობის პოლიტიკას. როგორ ვიყენებთ და ვიცავთ თქვენს პირად ინფორმაციას.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://soulart.ge/privacy-policy",
  },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
