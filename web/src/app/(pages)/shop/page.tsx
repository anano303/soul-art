import { Suspense } from "react";
import ShopContent from "./ShopContent";
import { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  console.log("generateMetadata called");
  try {
    // Await searchParams as it's now a Promise in Next.js 15+
    const params = await searchParams;

    // Get brand from search params
    const brand = typeof params?.brand === "string" ? params.brand : "";

    let apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/products?page=1&limit=1&sort=createdAt&direction=desc&populate=user&populate=images`;
    if (brand) {
      apiUrl += `&brand=${encodeURIComponent(brand)}`;
    }

    // Fetch the most recent product (or most recent from specific brand) to use as representative image
    const response = await fetch(apiUrl, {
      cache: "no-store",
    });

    console.log("API URL:", apiUrl);
    console.log("Response status:", response.status);

    let representativeImage = "/logo.png"; // fallback to logo
    let authorInfo = brand || "SoulArt"; // Use brand as default author for brand pages
    let title =
      "პირველი პლატფორმა საქართველოში - ხელნაკეთი ნივთები და ნახატები | SoulArt";
    let description =
      "შეიძინეთ უნიკალური ხელნაკეთი ნივთები და ნახატები SoulArt-ის ონლაინ პლატფორმაზე. ქართველი ხელოვანების ნამუშევრები, ხელნაკეთი ნივთები, აქსესუარები და დეკორი. ხარისხიანი ნივთები საუკეთესო ფასად საქართველოში. Shop unique handmade items and paintings.";

    if (response.ok) {
      const data = await response.json();
      console.log("API Response:", data); // დამატება
      if (data.items && data.items.length > 0) {
        const latestProduct = data.items[0];

        // For brand pages, use the populated user information
        if (brand && latestProduct.user) {
          authorInfo =
            latestProduct.user.name || latestProduct.user.storeName || brand;
        }

        // Use brandLogo as primary representative image for brand pages, fallback to product image
        if (latestProduct.brandLogo) {
          representativeImage = latestProduct.brandLogo;
        } else if (latestProduct.images && latestProduct.images.length > 0) {
          const imageUrl = latestProduct.images[0];
          // Ensure the image URL is absolute for OpenGraph
          representativeImage = imageUrl.startsWith("http")
            ? imageUrl
            : `https://soulart.ge${imageUrl}`;
        }
      }
    } else {
      console.log("API Error:", response.status); // დამატება
    }

    // Update title and description to include brand/author info (outside API check)
    if (brand) {
      title = `${authorInfo}'s Art Shop | SoulArt`;
      description = `შეიძინეთ ${authorInfo}-ის უნიკალური ნამუშევრები SoulArt-ის ონლაინ პლატფორმაზე. ქართველი ხელოვანების ნამუშევრები, ნახატები,  ხელნაკეთი ნივთები.`;
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
        "ნახატები",
        "ქართველი მხატვრების ნახატები",
        "საჩუქრები",
        "საჩუქრად ნახატები",
        "საჩუქრად ხელნაკეთი ნივთები",
        "ნახატიები ონლაინ",
        "ხელნაკეთი ნივთები ონლაინ",
        "ქართველი მხატვრები",
        "ქართული ხელოვნება",
        "ნახატი",
        "ხელნაკეთი",
        "ნახატების საიტი",
        "ხელნაკეთი ნივთების საიტი",
        "ნახატების მაღაზია",
        "ხელნაკეთი ნივთების მაღაზია",
        "ხელოვანები",
        "ქართული ხელოვნება ონლაინ",
        "ქართველი მხატვრები",
        "ნახატების ვებგვერდი",
        "ხელნაკეთი ნივთების ვებგვერდი",
        "ყველა ქართველი მხატვრის ნახატები",
        "ყველა ქართველი ხელოვანის ხელნაკეთი ნივთები",
        "ქართველი მხატვრების ნამუშევრები",
        "ქართველი ხელოვანების ნამუშევრები",
        "Soulart ბლოგი",
        "Soulart ინტერვიუები",
        "Soulart ქართველი მხატვრები",
        "ხელოვანები",
        "Soulart.ge",
        "ხელნაკეთი ნივთები",
        "იყიდება ნახატები",
        "იყიდება ხელნაკეთი ნივთები",
        "ხელოვნების პლატფორმა",
        "ხელოვანების მხარდაჭერა",
        "Soulart ისტორია",
        "ქართული პლატფორმა",
        "ხელოვანებისთვის",
        "ხელნაკეთი ნივთები",
        "ფასდაკლებები",
        "ხელოვნების ბაზარი",
        "ნახატების კოლექცია",
        "ხელოვნების გალერეა",
        "ხელოვანების საზოგადოება",
        "იყიდება ხელოვნების ნიმუშები",
        "ხელოვნების ღონისძიებები",
        "ხელოვნების გამოფენები",
        "ჩვენი ისტორია",
        "იყიდება ნახატები ონლაინ",
        "იყიდება ხელნაკეთი ნივთები ონლაინ",
        "ხელოვნების პლატფორმა საქართველოში",
        "ხელოვანების მხარდაჭერა ონლაინ",
        "Soulart ისტორია",
        "დამფუძნებლები",
        "მისია",
        "ხედვა",
        "ლევან ბეროშვილი",
        "ანი ბეროშვილი",
        "about us",
        "our story",
        "mission",
        "vision",
        "handmade items",
        "Georgian art",
        "Georgian artists",
        "paintings for sale",
        "handmade for sale",
        "art marketplace",
        "art community",
        "buy art online",
        "buy handmade online",
        "art platform",
        "support artists",
        "Soulart history",
        "paintings for sale",
        "handmade for sale",
        "Georgian platform",
        "handmade",
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
              ? `${authorInfo}'s Art Collection - SoulArt`
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
