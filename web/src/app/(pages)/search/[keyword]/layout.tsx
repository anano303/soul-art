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
    title: `ძიება: ${decodedKeyword} - MyHunter | Search: ${decodedKeyword}`,
    description: `ძიების შედეგები "${decodedKeyword}" - სანადირო და სათევზაო აღჭურვილობა MyHunter-ში. Search results for "${decodedKeyword}" - hunting and fishing equipment at MyHunter.`,
    keywords: [
      decodedKeyword,
      "ძიება",
      "სანადირო",
      "სათევზაო",
      "აღჭურვილობა",
      "პროდუქტები",
      "MyHunter",
      "მაიჰანტერი",
      "search",
      "hunting",
      "fishing",
      "equipment",
      "products",
      "find",
      "results",
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
      title: `ძიება: ${decodedKeyword} - MyHunter`,
      description: `ძიების შედეგები "${decodedKeyword}" - სანადირო და სათევზაო აღჭურვილობა MyHunter-ში.`,
      url: `https://myhunter.ge/search/${encodeURIComponent(decodedKeyword)}`,
      siteName: "MyHunter",
      images: [
        {
          url: "/logo.png",
          width: 1200,
          height: 630,
          alt: `MyHunter ძიება - ${decodedKeyword}`,
        },
      ],
      locale: "ka_GE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `ძიება: ${decodedKeyword} - MyHunter`,
      description: `ძიების შედეგები "${decodedKeyword}" - სანადირო და სათევზაო აღჭურვილობა MyHunter-ში.`,
      images: ["/logo.png"],
    },
    alternates: {
      canonical: `https://myhunter.ge/search/${encodeURIComponent(
        decodedKeyword
      )}`,
    },
  };
}

export default function SearchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
