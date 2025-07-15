import type { Metadata } from "next";
import "./globals.css";
import "../styles/performance.css";
import { Providers } from "./providers";
// import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";

import { satoshi } from "./(pages)/fonts";
import Footer from "@/components/footer/footer";
import { LanguageProvider } from "@/hooks/LanguageContext";
import Header from "@/components/header/header";
import MessengerChatWrapper from "@/components/MessengerChat/MessengerChatWrapper";
import { CartProvider } from "@/modules/cart/context/cart-context";
import { CheckoutProvider } from "@/modules/checkout/context/checkout-context";
import {
  organizationSchema,
  websiteSchema,
  storeSchema,
} from "@/lib/structured-data";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_CLIENT_URL || "https://Soulart.ge"
  ),
  title: "Soulart - ხელნაკეთი ნივთების და ნახატების მაღაზია საქართველოში",
  description:
    "უნიკალური ხელნაკეთი ნივთები, ნახატები, ხელოვნების ნამუშევრები. ხარისხი, სანდოობა, ფასი. Unique handmade items, paintings, artworks in Georgia",
  keywords: [
    "ხელნაკეთი",
    "ნახატები",
    "ხელოვნება",
    "ნამუშევრები",
    "მაღაზია",
    "Soulart",
    "საქართველო",
    "handmade",
    "paintings",
    "artworks",
    "art",
    "store",
    "Georgia",
    "crafts",
    "gallery",
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
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  other: {
    "google-site-verification":
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "", // backup
    "geo.region": "GE",
    "geo.placename": "Georgia",
    "geo.position": "41.7151;44.8271", // თბილისის კოორდინატები
    ICBM: "41.7151, 44.8271",
  },
  openGraph: {
    type: "website",
    locale: "ka_GE",
    url: "https://Soulart.ge/",
    siteName: "Soulart",
    title: "Soulart - ხელნაკეთი ნივთების და ნახატების მაღაზია საქართველოში",
    description:
      "უნიკალური ხელნაკეთი ნივთები, ნახატები, ხელოვნების ნამუშევრები. ხარისხი, სანდოობა, ფასი",
    images: [
      {
        url: "/van gog.jpg",
        width: 1200,
        height: 630,
        alt: "Soulart - ხელნაკეთი ნივთების და ნახატების მაღაზია",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Soulart - ხელნაკეთი ნივთების და ნახატების მაღაზია",
    description:
      "ხელნაკეთი ნივთების და ნახატების საუკეთესო არჩევანი საქართველოში",
    images: ["/van gog.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Favicon links */}
        <link rel="icon" href="/van gog.jpg" />
        <link rel="apple-touch-icon" href="/van gog.jpg" />
        <link rel="shortcut icon" href="/van gog.jpg" />
        <link rel="mask-icon" href="/van gog.jpg" color="#000000" />
        <meta name="msapplication-TileImage" content="/van gog.jpg" />
        {/* Facebook SDK - Fix appId to lowercase appid */}
        <script
          async
          defer
          crossOrigin="anonymous"
          src={`https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v13.0&appid=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&autoLogAppEvents=1`}
        />
        {/* Remove the problematic prefetch links */}
        {/* Add Google Fonts link */}
        {/* <link
          href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        /> */}
      </head>
      <body
        className={`${satoshi.variable} antialiased min-h-screen flex flex-col overflow-x-hidden`}
        style={{ maxWidth: "100vw" }}
      >
        <Providers>
          <AuthProvider>
            <CartProvider>
              <CheckoutProvider>
                <LanguageProvider>
                  <Header />
                  {children}
                  <Footer />
                </LanguageProvider>
              </CheckoutProvider>
            </CartProvider>
          </AuthProvider>
        </Providers>

        {/* Wrap in error boundary */}
        <ErrorBoundary>
          <MessengerChatWrapper />
        </ErrorBoundary>

        {/* Google Analytics */}
        <GoogleAnalytics />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(storeSchema),
          }}
        />
      </body>
    </html>
  );
}

// Simple error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
