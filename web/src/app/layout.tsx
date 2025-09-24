import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";

import Footer from "@/components/footer/footer";
import { LanguageProvider } from "@/hooks/LanguageContext";
import Header from "@/components/header/header";
import MessengerChatWrapper from "@/components/MessengerChat/MessengerChatWrapper";

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
import { FloatingCartIcon } from "@/components/floating-cart-icon/floating-cart-icon";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt/pwa-install-prompt";
import { NetworkStatus } from "@/components/network-status/network-status";
import { PushNotificationManager } from "@/components/push-notifications/push-notifications";
import { CacheManager } from "@/components/cache-manager/cache-manager";
import PWAManager from "@/components/pwa-manager";
import "@/lib/cloudflare-cleanup"; // Auto-cleanup Cloudflare cookies in development

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_CLIENT_URL || "https://Soulart.ge"
  ),
  title:
    "Soulart - ნახატების და ხელნაკეთი ნივთების პირველი ონლაინ პლატფორმა   საქართველოში",
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
      "უნიკალური ხელნაკეთი ნივთები, ნახატები, ხელოვნების ნამუშევრები. ხარისხი, სანდოობა, ფასი",
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

        {/* Conditional PWA Registration - Only for installed apps on mobile */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // PWA Detection Functions
              function isRunningAsInstalledPWA() {
                const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
                const isFullscreen = window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches;
                const isMinimalUi = window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches;
                const isIOSStandalone = 'standalone' in window.navigator && window.navigator.standalone;
                const isFromHomescreen = window.location.search.includes('utm_source=homescreen');
                
                return isStandalone || isFullscreen || isMinimalUi || isIOSStandalone || isFromHomescreen;
              }

              function isMobileDevice() {
                const userAgent = navigator.userAgent || navigator.vendor || window.opera;
                const mobilePatterns = [/Android/i, /webOS/i, /iPhone/i, /iPad/i, /iPod/i, /BlackBerry/i, /Windows Phone/i, /Mobile/i];
                return mobilePatterns.some(pattern => pattern.test(userAgent));
              }

              // Conditional Service Worker Registration
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  const isInstalled = isRunningAsInstalledPWA();
                  const isMobile = isMobileDevice();
                  const isProduction = '${process.env.NODE_ENV}' === 'production';
                  
                  if (isInstalled && isMobile && isProduction) {
                    // Register service worker for installed PWA on mobile
                    navigator.serviceWorker.register('/sw.js')
                      .then((registration) => {
                        console.log('SW registered for installed PWA: ', registration);
                      })
                      .catch((registrationError) => {
                        console.log('SW registration failed: ', registrationError);
                      });
                  } else {
                    // Unregister any existing service workers if conditions not met
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for(let registration of registrations) {
                        registration.unregister();
                        console.log('SW unregistered - not running as installed PWA or not mobile');
                      }
                    });
                  }

                  // Listen for display mode changes
                  if (window.matchMedia) {
                    const mediaQuery = window.matchMedia('(display-mode: standalone)');
                    mediaQuery.addListener ? mediaQuery.addListener((e) => {
                      if (e.matches && isMobile && isProduction) {
                        console.log('App switched to standalone mode');
                        navigator.serviceWorker.register('/sw.js');
                      }
                    }) : mediaQuery.addEventListener('change', (e) => {
                      if (e.matches && isMobile && isProduction) {
                        console.log('App switched to standalone mode');
                        navigator.serviceWorker.register('/sw.js');
                      }
                    });
                  }
                });
              }
            `,
          }}
        />

        {/* Resource preloading for better performance */}
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

        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//connect.facebook.net" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />

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
        className="antialiased min-h-screen flex flex-col overflow-x-hidden"
        style={{ maxWidth: "100vw" }}
      >
        {/* Dynamic Favicon Handler */}
        <DynamicFavicon />

        <Providers>
          <AuthProvider>
            <CartProvider>
              <CheckoutProvider>
                <LanguageProvider>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minHeight: "100vh",
                    }}
                  >
                    <Header />
                    <div style={{ flex: 1 }}>{children}</div>
                    <Footer />
                    <FloatingCartIcon />
                  </div>
                </LanguageProvider>
              </CheckoutProvider>
            </CartProvider>
          </AuthProvider>
        </Providers>

        {/* Wrap in error boundary */}
        <ErrorBoundary>
          <MessengerChatWrapper />
        </ErrorBoundary>

        {/* Network Status Indicator */}
        <NetworkStatus />

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* Push Notifications */}
        <PushNotificationManager />

        {/* PWA Manager - Conditional PWA functionality */}
        <PWAManager />

        {/* Cache Manager - მხოლოდ development-ში */}
        {process.env.NODE_ENV === "development" && (
          <CacheManager position="fixed" size="small" />
        )}

        {/* Google Analytics */}
        <GoogleAnalytics />

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
      </body>
    </html>
  );
}

// Simple error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
