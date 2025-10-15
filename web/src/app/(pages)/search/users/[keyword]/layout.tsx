import { Metadata } from "next";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ keyword: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ keyword: string }>;
}): Promise<Metadata> {
  const { keyword } = await params;
  const decodedKeyword = decodeURIComponent(keyword || "");

  return {
    title: `Artists: ${decodedKeyword} - Soulart`,
    description: `Search results for artists matching "${decodedKeyword}" on Soulart. Discover talented Georgian artists and their unique handmade artworks.`,
    keywords: [
      decodedKeyword,
      "artists",
      "search",
      "Georgian artists",
      "handmade art",
      "artwork",
      "ხელნაკეთი",
      "არტისტები",
      "ნახატები",
      "ხელოვნება",
      "Soulart",
      "artist search",
      "art community",
      "creative professionals",
      "art discovery",
    ],
    authors: [{ name: "Soulart" }],
    creator: "Soulart",
    publisher: "Soulart",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: `Artists: ${decodedKeyword} - Soulart`,
      description: `Discover talented artists matching "${decodedKeyword}" on Soulart`,
      url: `https://soulart.ge/search/users/${keyword}`,
      siteName: "Soulart",
      images: [
        {
          url: "/logo.png",
          width: 1200,
          height: 630,
        },
      ],
      locale: "ka_GE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Artists: ${decodedKeyword} - Soulart`,
      description: `Discover talented artists matching "${decodedKeyword}" on Soulart`,
      creator: "@soulart_ge",
      images: ["/logo.png"],
    },
    alternates: {
      canonical: `https://soulart.ge/search/users/${keyword}`,
    },
  };
}

export default function UsersSearchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}