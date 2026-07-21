import type { Metadata } from "next";

// API base URL for server-side fetching
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

interface AuctionData {
  _id: string;
  title: string;
  description: string;
  mainImage: string;
  artworkType: "ORIGINAL" | "REPRODUCTION";
  dimensions: string;
  material: string;
  startingPrice: number;
  currentPrice: number;
  endDate: string;
  status: string;
  totalBids: number;
  seller: {
    name?: string;
    storeName?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
  };
}

async function getAuction(id: string): Promise<AuctionData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auctions/${id}`, {
      cache: "no-store", // Always fetch fresh data for metadata
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getSellerName(seller: AuctionData["seller"]): string {
  if (seller.ownerFirstName && seller.ownerLastName) {
    return `${seller.ownerFirstName} ${seller.ownerLastName}`;
  }
  return seller.storeName || seller.name || "SoulArt Artist";
}

function formatPrice(price: number): string {
  return `${price.toLocaleString("ka-GE")} ₾`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: auctionId } = await params;

  // Skip metadata generation for reserved routes
  if (["create", "admin", "new"].includes(auctionId?.toLowerCase())) {
    return {
      title: "აუქციონები | SoulArt",
    };
  }

  const auction = await getAuction(auctionId);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.soulart.ge";

  if (!auction) {
    // Fallback metadata when auction not found or API unavailable
    return {
      title: "აუქციონი | SoulArt",
      description: "SoulArt აუქციონი - იყიდეთ უნიკალური ხელოვნების ნიმუშები!",
      openGraph: {
        type: "website",
        locale: "ka_GE",
        url: `${siteUrl}/auctions/${auctionId}`,
        siteName: "SoulArt - ქართული ხელოვნების მარკეტფლეისი",
        title: "🎨 აუქციონი | SoulArt",
        description: "იყიდეთ უნიკალური ხელოვნების ნიმუშები SoulArt აუქციონზე!",
        images: [
          {
            url: `${siteUrl}/auction.jpg`,
            width: 1200,
            height: 630,
            alt: "SoulArt აუქციონები",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "🎨 აუქციონი | SoulArt",
        description: "იყიდეთ უნიკალური ხელოვნების ნიმუშები!",
        images: [`${siteUrl}/auction.jpg`],
      },
    };
  }

  const sellerName = getSellerName(auction.seller);
  const artworkTypeGe =
    auction.artworkType === "ORIGINAL" ? "ორიგინალი" : "რეპროდუქცია";
  const endDate = new Date(auction.endDate);
  const formattedEndDate = endDate.toLocaleDateString("ka-GE", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Compact description for social sharing (shows in preview)
  const socialDescription = `💰 ${formatPrice(auction.currentPrice)} | 🎨 ${sellerName} | ${artworkTypeGe}
📐 ${auction.dimensions} | ${auction.material}
⏰ სრულდება: ${formattedEndDate}`;

  // Short description for meta description
  const shortDescription = `${auction.title} - ${artworkTypeGe} | ფასი: ${formatPrice(auction.currentPrice)} | მხატვარი: ${sellerName} | ზომა: ${auction.dimensions}`;

  // Keywords for SEO
  const keywords = [
    auction.title,
    sellerName,
    artworkTypeGe,
    auction.material,
    "აუქციონი",
    "ხელოვნება",
    "ნახატი",
    "მხატვრობა",
    "SoulArt",
    "ქართული ხელოვნება",
    "Georgian art",
    "art auction",
    "online auction",
    "buy art",
    "original artwork",
    "contemporary art",
    "კონტემპორარული ხელოვნება",
    "თანამედროვე მხატვრობა",
  ].join(", ");

  const auctionUrl = `${siteUrl}/auctions/${auctionId}`;

  return {
    title: `${auction.title} | აუქციონი - ${sellerName} | SoulArt`,
    description: shortDescription,
    keywords,
    authors: [{ name: sellerName }],
    creator: sellerName,
    publisher: "SoulArt",
    robots: {
      index: auction.status !== "CANCELLED",
      follow: true,
      googleBot: {
        index: auction.status !== "CANCELLED",
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: auctionUrl,
      languages: {
        "ka-GE": auctionUrl,
        "en-US": `${siteUrl}/en/auctions/${auctionId}`,
      },
    },
    openGraph: {
      type: "website",
      locale: "ka_GE",
      url: auctionUrl,
      siteName: "SoulArt - ქართული ხელოვნების მარკეტფლეისი",
      title: `🎨 ${auction.title} | ${formatPrice(auction.currentPrice)}`,
      description: socialDescription,
      images: [
        {
          url: auction.mainImage,
          width: 1200,
          height: 630,
          alt: `${auction.title} - ${artworkTypeGe} ნამუშევარი ${sellerName}-სგან`,
          type: "image/jpeg",
        },
        {
          url: auction.mainImage,
          width: 800,
          height: 800,
          alt: auction.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@soulart_ge",
      creator: "@soulart_ge",
      title: `🎨 ${auction.title} | ${formatPrice(auction.currentPrice)}`,
      description: socialDescription,
      images: [auction.mainImage],
    },
    other: {
      // Facebook specific
      "fb:app_id": process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "",
      // Pinterest
      "pinterest-rich-pin": "true",
      // Price info for rich snippets
      "product:price:amount": auction.currentPrice.toString(),
      "product:price:currency": "GEL",
      "product:availability":
        auction.status === "ACTIVE" ? "in stock" : "out of stock",
      "product:condition":
        auction.artworkType === "ORIGINAL" ? "new" : "refurbished",
      // Auction specific
      "auction:start_price": auction.startingPrice.toString(),
      "auction:current_bid": auction.currentPrice.toString(),
      "auction:bid_count": auction.totalBids.toString(),
      "auction:end_time": auction.endDate,
    },
  };
}

export default function AuctionDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
