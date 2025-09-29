import { Suspense } from "react";
import ShopContent from "./ShopContent";
import { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  try {
    // Get brand from search params
    const brand =
      typeof searchParams?.brand === "string" ? searchParams.brand : "";

    let apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/products?page=1&limit=1&sort=createdAt&direction=desc`;
    if (brand) {
      apiUrl += `&brand=${encodeURIComponent(brand)}`;
    }

    // Fetch the most recent product (or most recent from specific brand) to use as representative image
    const response = await fetch(apiUrl, {
      cache: "no-store",
    });

    let representativeImage = "/logo.png"; // fallback to logo
    let authorInfo = "SoulArt";
    let title = "პირველი პლატფორმა საქართველოში - ხელნაკეთი ნივთები და ნახატები | SoulArt";
    let description =
      "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ პლატფორმაზე. ქართველი ხელოვანების ნამუშევრები, ხელნაკეთი ნივთები, აქსესუარები და დეკორი. ხარისხიანი ნივთები საუკეთესო ფასად საქართველოში. Shop unique handmade items and paintings.";

    if (response.ok) {
      const data = await response.json();
      if (data.products && data.products.length > 0) {
        const latestProduct = data.products[0];
        // Use the last added image of the most recent product
        if (latestProduct.images && latestProduct.images.length > 0) {
          representativeImage =
            latestProduct.images[latestProduct.images.length - 1];
        }

        // Use author's information
        if (latestProduct.user) {
          authorInfo =
            latestProduct.user.storeName ||
            latestProduct.user.name ||
            brand ||
            "SoulArt";
        }

        // Update title and description to include author info
        if (brand) {
          title = `${brand} - ხელნაკეთი ნივთები და ნახატები | SoulArt`;
          description = `შეიძინეთ ${authorInfo}-ის უნიკალური ნამუშევრები SoulArt-ის ონლაინ პლატფორმაზე. ქართველი ხელოვანების ნამუშევრები, ნახატები,  ხელნაკეთი ნივთები.`;
        }
      }
    }

    return {
      title,
      description,
      keywords: [
        "პლატფორმა",
        "ხელნაკეთი ნივთები",
        "ნახატები",
        "ქართველი მხატვრები",
        "SoulArt",
        "ხელნაკეთი სამკაულები",
        "ხელნაკეთი აქსესუარები",
        "დეკორი",
        "ხელოვნება",
        "shop",
        "handmade items",
        "paintings",
        "georgian artists",
        "handmade jewelry",
        "handmade accessories",
        "art",
        "decor",
        "Georgia",
        "unique art",
        "artisan crafts",
      ],
      authors: [{ name: authorInfo }],
      creator: authorInfo,
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
        title,
        description,
        url: brand
          ? `https://soulart.ge/shop?brand=${encodeURIComponent(brand)}`
          : "https://soulart.ge/shop",
        siteName: "SoulArt",
        images: [
          {
            url: representativeImage,
            width: 1200,
            height: 630,
            alt: brand
              ? `${brand} - SoulArt პლატფორმა`
              : "SoulArt პლატფორმა - ხელნაკეთი ნივთები და ნახატები",
          },
        ],
        locale: "ka_GE",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [representativeImage],
      },
      alternates: {
        canonical: brand
          ? `https://soulart.ge/shop?brand=${encodeURIComponent(brand)}`
          : "https://soulart.ge/shop",
      },
    };
  } catch (error) {
    console.error("Error generating shop metadata:", error);
    // Fallback metadata
    return {
      title: "პლატფორმა - ხელნაკეთი ნივთები და ნახატები | SoulArt",
      description:
        "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ პლატფორმაზე.",
      openGraph: {
        title: "პლატფორმა - ხელნაკეთი ნივთები და ნახატები | SoulArt",
        description:
          "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ პლატფორმაზე.",
        images: [
          {
            url: "/logo.png",
            width: 1200,
            height: 630,
            alt: "SoulArt პლატფორმა",
          },
        ],
        locale: "ka_GE",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "პლატფორმა - ხელნაკეთი ნივთები და ნახატები | SoulArt",
        description:
          "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ პლატფორმაზე.",
        images: ["/logo.png"],
      },
    };
  }
}

const ShopPage = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <ShopContent />
      </Suspense>
    </div>
  );
};

export default ShopPage;
