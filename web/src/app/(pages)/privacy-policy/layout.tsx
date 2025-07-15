import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "კონფიდენციალურობის პოლიტიკა - MyHunter | Privacy Policy",
  description:
    "გაეცანით MyHunter-ის კონფიდენციალურობის პოლიტიკას. როგორ ვიყენებთ და ვიცავთ თქვენს პირად ინფორმაციას. GDPR შესაბამისი მონაცემთა დაცვის პოლიტიკა. Privacy Policy - MyHunter data protection.",
  keywords: [
    "კონფიდენციალურობის პოლიტიკა",
    "მონაცემთა დაცვა",
    "პირადი ინფორმაცია",
    "უსაფრთხოება",
    "GDPR",
    "MyHunter",
    "მაიჰანტერი",
    "privacy policy",
    "data protection",
    "personal information",
    "security",
    "privacy",
    "terms",
    "conditions",
  ],
  authors: [{ name: "MyHunter" }],
  creator: "MyHunter",
  publisher: "MyHunter",
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
    title: "კონფიდენციალურობის პოლიტიკა - MyHunter | Privacy Policy",
    description:
      "გაეცანით MyHunter-ის კონფიდენციალურობის პოლიტიკას. როგორ ვიყენებთ და ვიცავთ თქვენს პირად ინფორმაციას.",
    url: "https://myhunter.ge/privacy-policy",
    siteName: "MyHunter",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "MyHunter კონფიდენციალურობის პოლიტიკა",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "კონფიდენციალურობის პოლიტიკა - MyHunter",
    description:
      "გაეცანით MyHunter-ის კონფიდენციალურობის პოლიტიკას. როგორ ვიყენებთ და ვიცავთ თქვენს პირად ინფორმაციას.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://myhunter.ge/privacy-policy",
  },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
