import { ProtectedRoute } from "@/components/protected-route";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "პროფილი | მონადირე - My Hunter Profile",
  description:
    "მომხმარებლის პროფილი, შეკვეთების ისტორია და პერსონალური პარამეტრები. User profile, order history and personal settings.",
  keywords: [
    "პროფილი",
    "მომხმარებლის პროფილი",
    "შეკვეთების ისტორია",
    "პერსონალური პარამეტრები",
    "ანგარიში",
    "profile",
    "user profile",
    "account",
    "order history",
    "personal settings",
    "my account",
    "user dashboard",
    "hunting gear profile",
    "მონადირე პროფილი",
  ],
  openGraph: {
    title: "პროფილი | მონადირე - My Hunter Profile",
    description:
      "მომხმარებლის პროფილი, შეკვეთების ისტორია და პერსონალური პარამეტრები",
    type: "website",
    url: "/profile",
    siteName: "მონადირე - My Hunter",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "მონადირე - My Hunter Profile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "პროფილი | მონადირე - My Hunter Profile",
    description:
      "მომხმარებლის პროფილი, შეკვეთების ისტორია და პერსონალური პარამეტრები",
    images: ["/logo.png"],
  },
  robots: {
    index: false,
    follow: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
