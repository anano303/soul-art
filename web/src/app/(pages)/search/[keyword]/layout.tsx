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
    title: `ძიება: ${decodedKeyword} - Soulart | Search: ${decodedKeyword}`,
    description: `ძიების შედეგები "${decodedKeyword}" - ხელნაკეთი ნივთები და ნახატები Soulart-ში. Search results for "${decodedKeyword}" - handmade items and paintings at Soulart.`,
    keywords: [
      decodedKeyword,
      "ძიება",
      "ხელნაკეთი",
      "ნახატები",
      "ხელოვნება",
      "ნამუშევრები",
      "Soulart",
      "search",
      "handmade",
      "paintings",
      "artworks",
      "art",
      "crafts",
      "find",
      "results",
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
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: `ძიება: ${decodedKeyword} - Soulart`,
      description: `ძიების შედეგები "${decodedKeyword}" - ხელნაკეთი ნივთები და ნახატები Soulart-ში.`,
      url: `https://soulart.ge/search/${encodeURIComponent(decodedKeyword)}`,
      siteName: "Soulart",
      images: [
        {
          url: "/van-gogh.jpg",
          width: 1200,
          height: 630,
          alt: `Soulart ძიება - ${decodedKeyword}`,
        },
      ],
      locale: "ka_GE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `ძიება: ${decodedKeyword} - Soulart`,
      description: `ძიების შედეგები "${decodedKeyword}" - ხელნაკეთი ნივთები და ნახატები Soulart-ში.`,
      images: ["/van-gogh.jpg"],
    },
    alternates: {
      canonical: `https://soulart.ge/search/${encodeURIComponent(
        decodedKeyword
      )}`,
    },
  };
}

export default function SearchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
