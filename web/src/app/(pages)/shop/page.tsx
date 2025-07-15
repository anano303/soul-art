import { Suspense } from "react";
import ShopContent from "./ShopContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "მაღაზია - სანადირო და სათევზაო აღჭურვილობა | MyHunter",
  description:
    "დაათვალიერეთ სანადირო და სათევზაო აღჭურვილობის ფართო არჩევანი მაიჰანტერის მაღაზიაში. ხარისხიანი პროდუქტები, საუკეთესო ფასები საქართველოში. Shop hunting and fishing equipment at MyHunter.",
  keywords: [
    "მაღაზია",
    "სანადირო აღჭურვილობა",
    "სათევზაო აღჭურვილობა",
    "პროდუქტები",
    "MyHunter",
    "მაიჰანტერი",
    "shop",
    "hunting equipment",
    "fishing equipment",
    "products",
    "Georgia",
    "outdoor gear",
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
    title: "მაღაზია - სანადირო და სათევზაო აღჭურვილობა | MyHunter",
    description:
      "დაათვალიერეთ სანადირო და სათევზაო აღჭურვილობის ფართო არჩევანი მაიჰანტერის მაღაზიაში. ხარისხიანი პროდუქტები, საუკეთესო ფასები საქართველოში.",
    url: "https://myhunter.ge/shop",
    siteName: "MyHunter",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "MyHunter მაღაზია",
      },
    ],
    locale: "ka_GE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "მაღაზია - სანადირო და სათევზაო აღჭურვილობა | MyHunter",
    description:
      "დაათვალიერეთ სანადირო და სათევზაო აღჭურვილობის ფართო არჩევანი მაიჰანტერის მაღაზიაში.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://myhunter.ge/shop",
  },
};

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
