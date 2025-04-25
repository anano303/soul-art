import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
// import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";
import { CartProvider } from "@/modules/cart/context/cart-context";
import { CheckoutProvider } from "@/modules/checkout/context/checkout-context";
import { satoshi } from "./(pages)/fonts";
import Footer from "@/components/footer/footer";
import { LanguageProvider } from "@/hooks/LanguageContext";
import Header from "@/components/header/header";
import SiteTimer from "@/components/SiteTimer/SiteTimer";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_CLIENT_URL || "https://soulart.ge"
  ),
  title: "SoulArt",
  description:
    "SoulArt - ნახატების ონლაინ პლატფორმა, სადაც შეგიძლიათ გაყიდოთ და შეიძინოთ უნიკალური ხელოვნების ნიმუშები. შექმენით პირადი გალერეა და გახდით მხატვარი ან კოლექციონერი.",
  openGraph: {
    type: "website",
    locale: "ka_GE",
    url: "https://soulart.ge/",
    siteName: "soulart",
    title: "soulart",
    images: [
      {
        url: "/van%20gog.jpg",
        width: 1200,
        height: 630,
        alt: "SoulArt Sharing Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SoulArt",
    description:
      "SoulArt - ნახატების ონლაინ პლატფორმა უნიკალური ხელოვნების ნიმუშებისთვის.",
    images: ["/van%20gog.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Facebook SDK */}
        <script
          async
          defer
          crossOrigin="anonymous"
          src={`https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v13.0&appId=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&autoLogAppEvents=1`}
        />
        {/* Remove the problematic prefetch links */}
      </head>
      <body
        className={`${satoshi.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          <AuthProvider>
            <CartProvider>
              <CheckoutProvider>
                <LanguageProvider>
                  <SiteTimer />
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </LanguageProvider>
              </CheckoutProvider>
            </CartProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
