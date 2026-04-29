import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";

import { LanguageProvider } from "@/hooks/LanguageContext";
import { ThemeProvider } from "@/hooks/ThemeContext";
import Header from "@/components/header/header";
import {
  GLOBAL_KEYWORDS,
  getArtistKeywords,
  getBannerKeywords,
  getCategoryKeywords,
  getSubCategoryKeywords,
  getForumKeywords,
  getProductKeywords,
  mergeKeywordSets,
} from "@/lib/seo-keywords";

const PRIMARY_COLOR = "#012645";

// Local font optimization for better performance
const firago = localFont({
  src: [
    {
      path: "../../public/fonts/firago-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/firago-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/firago-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/firago-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-firago",
  display: "swap",
  preload: true,
});

import { CartProvider } from "@/modules/cart/context/cart-context";
import { CheckoutProvider } from "@/modules/checkout/context/checkout-context";
import DynamicFavicon from "@/components/dynamic-favicon";
import {
  organizationSchema,
  websiteSchema,
  storeSchema,
} from "@/lib/structured-data";
import "@/lib/cloudflare-cleanup"; // Auto-cleanup Cloudflare cookies in development
import { LayoutDeferredComponents, LayoutFooter } from "./layout-deferred";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const [
    productKeywords,
    artistKeywords,
    forumKeywords,
    categoryKeywords,
    subCategoryKeywords,
    bannerKeywords,
  ] = await Promise.all([
    getProductKeywords(),
    getArtistKeywords(),
    getForumKeywords(),
    getCategoryKeywords(),
    getSubCategoryKeywords(),
    getBannerKeywords(),
  ]);
  const keywords = mergeKeywordSets(
    productKeywords,
    artistKeywords,
    forumKeywords,
    categoryKeywords,
    subCategoryKeywords,
    bannerKeywords,
    GLOBAL_KEYWORDS,
  ).slice(0, 200);

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_CLIENT_URL || "https://soulart.ge",
    ),
    title:
      "Soulart - ნახატების და ხელნაკეთი ნივთების პირველი ონლაინ პლატფორმა   საქართველოში",
    description:
      "უნიკალური ხელნაკეთი ნივთები, ნახატები, ხელოვნების ნამუშევრები. ხარისხი, სანდოობა, ფასი. Unique handmade items, paintings, artworks in Georgia",
    keywords,
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
    icons: {
      icon: "/icons/favicon/favicon-blue.ico",
      shortcut: "/icons/favicon/favicon-blue.ico",
      apple: "/icons/ios/icon-180x180.png",
      other: [
        {
          rel: "icon",
          url: "/icons/favicon/favicon-blue.ico",
          type: "image/x-icon",
        },
        {
          rel: "shortcut icon",
          url: "/icons/favicon/favicon-blue.ico",
          type: "image/x-icon",
        },
        { rel: "apple-touch-icon", url: "/icons/ios/icon-180x180.png" },
        {
          rel: "mask-icon",
          url: "/icons/favicon/favicon-blue.ico",
          color: PRIMARY_COLOR,
        },
      ],
    },
    openGraph: {
      type: "website",
      locale: "ka_GE",
      url: "https://Soulart.ge/",
      siteName: "Soulart",
      title:
        "Soulart - ნახატების და ხელნაკეთი ნივთების   პირველი ონლაინ პლატფორმა საქართველოში",
      description:
        "ქართველი ხელოვანების უნიკალური ხელნაკეთი ნივთები, ნახატები, ხელოვნების ნამუშევრები ერთ სივრცეში.",
      images: [
        {
          url: "/van-gogh.webp",
          width: 1200,
          height: 630,
          alt: "Soulart - ნახატების და ხელნაკეთი ნივთების   პირველი ონლაინ პლატფორმა საქართველოში",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title:
        "Soulart - ნახატების და ხელნაკეთი ნივთების   პირველი ონლაინ პლატფორმა საქართველოში",
      description:
        "ხელნაკეთი ნივთების და ნახატების საუკეთესო არჩევანი საქართველოში",
      images: ["/van-gogh.webp"],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Favicon links */}
        <link
          rel="icon"
          href="/icons/favicon/favicon-blue.ico"
          type="image/x-icon"
        />
        <link rel="apple-touch-icon" href="/icons/ios/icon-180x180.png" />
        <link
          rel="shortcut icon"
          href="/icons/favicon/favicon-blue.ico"
          type="image/x-icon"
        />
        <link
          rel="mask-icon"
          href="/icons/favicon/favicon-blue.ico"
          color={PRIMARY_COLOR}
        />
        <meta
          name="msapplication-TileImage"
          content="/icons/windows/icon-144x144.png"
        />
        {/* PWA Meta Tags */}
        <meta name="theme-color" content={PRIMARY_COLOR} />
        <meta name="msapplication-TileColor" content="#012645" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Soulart" />

        {/* iOS Specific Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Soulart" />

        {/* Windows Meta Tags */}
        <meta name="msapplication-starturl" content="/" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Preload critical resources - only existing resources */}

        {/* PWA will be handled by next-pwa and PWAManager component */}

        {/* Optimized resource hints */}
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
        />

        {/* DNS prefetch for external resources only */}
        <link rel="dns-prefetch" href="//connect.facebook.net" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />

        {/* Third-party scripts moved to body end for better LCP */}
      </head>
      <body
        className={`${firago.variable} antialiased min-h-screen flex flex-col`}
        style={{ maxWidth: "100vw", overflowX: "clip" }}
        suppressHydrationWarning={true}
      >
        {/* Suppress CSS preload warnings and third-party errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var ow=console.warn,oe=console.error;
                console.warn=function(){var m=String(Array.prototype.join.call(arguments,' '));if(/(preload|CSS|chunk|link|seconds|was preloaded|Download|Third-party|cookie)/.test(m))return;ow.apply(console,arguments)};
                console.error=function(){var m=String(Array.prototype.join.call(arguments,' '));if(/(madgicx|capig|facebook|fbevents|googletagmanager|analytics|Failed to load|Loading chunk|ChunkLoadError|net::ERR|hydrat)/.test(m))return;oe.apply(console,arguments)};
                window.addEventListener('error',function(e){if(e.filename&&/(madgicx|capig|facebook|googletagmanager|connect\.facebook)/.test(e.filename))return true},true);
                window.addEventListener('error',function(e){var m=String(e.message||'');if(/(Loading chunk|Failed to load|ChunkLoadError)/.test(m)){var k='cr_'+Date.now().toString().slice(0,-4);if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');location.reload()}}},true);
              })();
            `,
          }}
        />

        {/* Dynamic Favicon Handler */}
        <DynamicFavicon />

        <Providers>
          <AuthProvider>
            <CartProvider>
              <CheckoutProvider>
                <LanguageProvider>
                  <ThemeProvider>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "100vh",
                        backgroundColor: "#fefefe",
                      }}
                    >
                      <Header />
                      <main style={{ flex: 1 }} id="main-content" role="main">
                        {children}
                      </main>
                      <LayoutFooter />
                    </div>
                    {/* All non-critical components deferred with ssr:false */}
                    <LayoutDeferredComponents />
                  </ThemeProvider>
                </LanguageProvider>
              </CheckoutProvider>
            </CartProvider>
          </AuthProvider>
        </Providers>

        {/* Toast notifications */}
        <Toaster />

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

        {/* Deferred Third-Party Scripts - Loaded after page render for better LCP */}
        <script
          id="deferred-third-party"
          dangerouslySetInnerHTML={{
            __html: `
              // Load third-party scripts only after page is idle
              var _defer = window.requestIdleCallback || function(cb){setTimeout(cb,3000)};
              _defer(function() {
                // Google Ads
                var gtagScript = document.createElement('script');
                gtagScript.async = true;
                gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=AW-17709570539';
                document.head.appendChild(gtagScript);
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', 'AW-17709570539');
              });
              
              _defer(function() {
                // Google AdSense
                var adsScript = document.createElement('script');
                adsScript.async = true;
                adsScript.crossOrigin = 'anonymous';
                adsScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4844460357634251';
                document.head.appendChild(adsScript);
              });

              // Meta Pixel - defer by 5 seconds
              setTimeout(function() {
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${
                  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1189697243076610"
                }');
                fbq('track', 'PageView');
              }, 5000);
              
              // Facebook SDK - defer by 7 seconds
              setTimeout(function() {
                var fbScript = document.createElement('script');
                fbScript.async = true;
                fbScript.defer = true;
                fbScript.crossOrigin = 'anonymous';
                fbScript.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v13.0&appid=${
                  process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
                }&autoLogAppEvents=1';
                document.body.appendChild(fbScript);
              }, 7000);
            `,
          }}
        />
      </body>
    </html>
  );
}
