import { ProtectedRoute } from "@/components/protected-route";
import {
  ProfileNavigation,
  MobileProfileNavigation,
} from "@/components/profile-navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "პროფილი | Soulart - Profile | Soulart",
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
    "artist profile",
    "Soulart პროფილი",
    "ხელოვანის პროფილი",
  ],
  openGraph: {
    title: "პროფილი | Soulart - Profile | Soulart",
    description:
      "მომხმარებლის პროფილი, შეკვეთების ისტორია და პერსონალური პარამეტრები",
    type: "website",
    url: "/profile",
    siteName: "Soulart",
    images: [
      {
        url: "/van-gogh.jpg",
        width: 1200,
        height: 630,
        alt: "Soulart Profile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "პროფილი | Soulart - Profile | Soulart",
    description:
      "მომხმარებლის პროფილი, შეკვეთების ისტორია და პერსონალური პარამეტრები",
    images: ["/van-gogh.jpg"],
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
  return (
    <ProtectedRoute>
      <div className="container pb-8">
        <MobileProfileNavigation />
        <div className="flex gap-6">
          <ProfileNavigation />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
