import type { Metadata } from "next";

// API base URL for server-side fetching
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch auction for metadata:", error);
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
  params: { id: string };
}): Promise<Metadata> {
  const auctionId = params.id;

  // Skip metadata generation for reserved routes
  if (["create", "admin", "new"].includes(auctionId?.toLowerCase())) {
    return {
      title: "აუქციონები | SoulArt",
    };
  }

  const auction = await getAuction(auctionId);

  if (!auction) {
    return {
      title: "აუქციონი ვერ მოიძებნა | SoulArt",
      description: "მოთხოვნილი აუქციონი არ არსებობს ან წაშლილია.",
    };
  }

  const sellerName = getSellerName(auction.seller);
  const artworkTypeGe = auction.artworkType === "ORIGINAL" ? "ორიგინალი" : "რეპროდუქცია";
  const endDate = new Date(auction.endDate);
  const formattedEndDate = endDate.toLocaleDateString("ka-GE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Rich description for SEO
  const description = `🎨 ${auction.title} - ${artworkTypeGe} ნამუშევარი მხატვრისგან ${sellerName}. 
💰 საწყისი ფასი: ${formatPrice(auction.startingPrice)} | მიმდინარე ბიდი: ${formatPrice(auction.currentPrice)} | ბიდების რაოდენობა: ${auction.totalBids}
📐 ზომა: ${auction.dimensions} | მასალა: ${auction.material}
⏰ აუქციონი სრულდება: ${formattedEndDate}
🖼️ იყიდე უნიკალური ხელოვნების ნიმუში SoulArt აუქციონზე!`;

  // Short description for social sharing
  const shortDescription = `${auction.title} - ${artworkTypeGe} | მიმდინარე ფასი: ${formatPrice(auction.currentPrice)} | მხატვარი: ${sellerName}`;

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://soulart.ge";
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
      title: `🎨 ${auction.title} | აუქციონი`,
      description,
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
      title: `🎨 ${auction.title} | SoulArt აუქციონი`,
      description: shortDescription,
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
      "product:availability": auction.status === "ACTIVE" ? "in stock" : "out of stock",
      "product:condition": auction.artworkType === "ORIGINAL" ? "new" : "refurbished",
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
