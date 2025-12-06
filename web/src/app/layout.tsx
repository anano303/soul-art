import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";

import { LanguageProvider } from "@/hooks/LanguageContext";
import Header from "@/components/header/header";
import Footer from "@/components/footer/footer";
import MessengerChatWrapper from "@/components/MessengerChat/MessengerChatWrapper";
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
import { CartProvider } from "@/modules/cart/context/cart-context";
import { CheckoutProvider } from "@/modules/checkout/context/checkout-context";
import DynamicFavicon from "@/components/dynamic-favicon";
import {
  organizationSchema,
  websiteSchema,
  storeSchema,
} from "@/lib/structured-data";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import VercelAnalytics from "@/components/VercelAnalytics";
import MetaPixel from "@/components/MetaPixel";
import { FloatingCartIcon } from "@/components/floating-cart-icon/floating-cart-icon";
import { MobileBottomNav } from "@/components/mobile-bottom-nav/mobile-bottom-nav";
import { NetworkStatus } from "@/components/network-status/network-status";
import { CacheManager } from "@/components/cache-manager/cache-manager";
import { GA4UserTracker } from "@/components/ga4-user-tracker";
import { PageViewTracker } from "@/components/page-view-tracker";
import { VisitorTracker } from "@/components/visitor-tracker";
import { IOSGesturePrevention } from "@/components/ios-gesture-prevention";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt/pwa-install-prompt";
import { PushNotificationManager } from "@/components/push-notifications/push-notifications";
import PWAManager from "@/components/pwa-manager";
import "@/lib/cloudflare-cleanup"; // Auto-cleanup Cloudflare cookies in development

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
    GLOBAL_KEYWORDS
  ).slice(0, 200);

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_CLIENT_URL || "https://soulart.ge"
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
      icon: "/soulart_icon_blue_fullsizes.ico",
      shortcut: "/soulart_icon_blue_fullsizes.ico",
      apple: "/soulart_icon_blue_fullsizes.ico",
      other: [
        {
          rel: "icon",
          url: "/soulart_icon_blue_fullsizes.ico",
          type: "image/x-icon",
        },
        {
          rel: "shortcut icon",
          url: "/soulart_icon_blue_fullsizes.ico",
          type: "image/x-icon",
        },
        { rel: "apple-touch-icon", url: "/soulart_icon_blue_fullsizes.ico" },
        {
          rel: "mask-icon",
          url: "/soulart_icon_blue_fullsizes.ico",
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
          url: "/van-gogh.jpg",
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
      images: ["/van-gogh.jpg"],
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
          href="/soulart_icon_blue_fullsizes.ico"
          type="image/x-icon"
        />
        <link rel="apple-touch-icon" href="/soulart_icon_blue_fullsizes.ico" />
        <link
          rel="shortcut icon"
          href="/soulart_icon_blue_fullsizes.ico"
          type="image/x-icon"
        />
        <link
          rel="mask-icon"
          href="/soulart_icon_blue_fullsizes.ico"
          color={PRIMARY_COLOR}
        />
        <meta
          name="msapplication-TileImage"
          content="/soulart_icon_blue_fullsizes.ico"
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
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
          crossOrigin="anonymous"
        />

        {/* Preload LCP hero image */}
        <link
          rel="preload"
          as="image"
          href="/van-gogh.jpg"
          fetchPriority="high"
        />

        {/* DNS prefetch for external resources only */}
        <link rel="dns-prefetch" href="//connect.facebook.net" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />

        {/* Third-party scripts moved to body end for better LCP */}
      </head>
      <body
        className="antialiased min-h-screen flex flex-col overflow-x-hidden"
        style={{ maxWidth: "100vw" }}
        suppressHydrationWarning={true}
      >
        {/* Suppress CSS preload warnings and third-party errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Suppress console warnings
                var originalWarn = console.warn;
                console.warn = function() {
                  var message = Array.prototype.join.call(arguments, ' ');
                  if (!(message.includes('preload') ||
                        message.includes('CSS') ||
                        message.includes('chunk') ||
                        message.includes('link') ||
                        message.includes('seconds') ||
                        message.includes('was preloaded'))) {
                    originalWarn.apply(console, arguments);
                  }
                };
                
                // Suppress third-party errors (Madgicx, etc.)
                var originalError = console.error;
                console.error = function() {
                  var message = Array.prototype.join.call(arguments, ' ');
                  if (message.includes('madgicx') ||
                      message.includes('capig') ||
                      message.includes('reading \\'call\\'')) {
                    return; // Suppress Madgicx errors
                  }
                  originalError.apply(console, arguments);
                };
                
                // Global error handler to suppress third-party errors
                window.addEventListener('error', function(e) {
                  if (e.filename && (e.filename.includes('madgicx') || 
                      e.filename.includes('capig') ||
                      e.filename.includes('facebook'))) {
                    e.preventDefault();
                    return false;
                  }
                }, true);
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
                  {/* GA4 User ID Tracking */}
                  <GA4UserTracker />

                  {/* GA4 Page View and User Path Tracking */}
                  <PageViewTracker />

                  {/* Visitor Tracking with IP */}
                  <VisitorTracker />

                  {/* iOS Back Swipe Prevention */}
                  <IOSGesturePrevention />

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
                    <Footer />
                    <FloatingCartIcon />
                    <MobileBottomNav />
                  </div>
                </LanguageProvider>
              </CheckoutProvider>
            </CartProvider>
          </AuthProvider>

          {/* Push Notifications - moved inside Providers for QueryClient access */}
          <PushNotificationManager />

          {/* PWA Manager - Conditional PWA functionality */}
          <PWAManager />

          {/* Cache Manager - მხოლოდ development-ში */}
          {process.env.NODE_ENV === "development" && (
            <CacheManager position="fixed" size="small" />
          )}
        </Providers>

        {/* Wrap in error boundary */}
        <ErrorBoundary>
          <MessengerChatWrapper />
        </ErrorBoundary>

        {/* Network Status Indicator */}
        <NetworkStatus />

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* Google Analytics */}
        <GoogleAnalytics />

        {/* Meta Pixel - Facebook ვიზიტორების ტრაფიკი და კონვერსიები */}
        <Suspense fallback={null}>
          <MetaPixel /> {/* Temporarily disabled for testing */}
        </Suspense>

        {/* Vercel Analytics - ვიზიტორების ტრაფიკი და Performance */}
        <VercelAnalytics />

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
              // Google Ads - defer by 2 seconds
              setTimeout(function() {
                var gtagScript = document.createElement('script');
                gtagScript.async = true;
                gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=AW-17709570539';
                document.head.appendChild(gtagScript);
                
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', 'AW-17709570539');
              }, 2000);
              
              // Meta Pixel - defer by 2.5 seconds
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
              }, 2500);
              
              // Facebook SDK - defer by 3 seconds
              setTimeout(function() {
                var fbScript = document.createElement('script');
                fbScript.async = true;
                fbScript.defer = true;
                fbScript.crossOrigin = 'anonymous';
                fbScript.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v13.0&appid=${
                  process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
                }&autoLogAppEvents=1';
                document.body.appendChild(fbScript);
              }, 3000);
            `,
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
