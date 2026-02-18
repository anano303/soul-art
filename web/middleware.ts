import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Extend NextRequest to include Vercel's geo property
interface VercelRequest extends NextRequest {
  geo?: {
    city?: string;
    country?: string;
    region?: string;
    latitude?: string;
    longitude?: string;
  };
}

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth-callback",
  "/become-seller",
  "/forum",
  "/checkout",
  "/checkout/success",
  "/checkout/fail",
  "/donation",
  "/donation/success",
  "/donation/fail",
];
const protectedPaths = [
  "/profile",
  "/orders",
  // Admin paths removed - admin layout handles its own auth via localStorage
  // This prevents redirect issues when cookies aren't accessible in middleware
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for authentication tokens - Next.js 16 compatible way
  const accessToken = request.cookies.get("access_token");
  const refreshToken = request.cookies.get("refresh_token");
  const authSession = request.cookies.get("auth_session"); // Client-set cookie for middleware
  const hasTokens = !!(
    accessToken?.value ||
    refreshToken?.value ||
    authSession?.value
  );
  const isAuthenticated = hasTokens;

  // 🌍 Geolocation Detection - Extract from Vercel Edge
  const vercelRequest = request as VercelRequest;
  const geo = {
    country: vercelRequest.geo?.country || null,
    region: vercelRequest.geo?.region || null,
    city: vercelRequest.geo?.city || null,
    latitude: vercelRequest.geo?.latitude || null,
    longitude: vercelRequest.geo?.longitude || null,
  };

  // Debug logging (only in development or for geo-test page)
  if (process.env.NODE_ENV === 'development' || pathname.includes('/geo-test')) {
    console.log('[Middleware] Processing:', pathname);
    console.log('[Middleware] Geo data:', geo);
    console.log('[Middleware] Full request.geo:', vercelRequest.geo);
  }

  // Currency mapping based on country
  const currencyMap: Record<string, string> = {
    GE: "GEL", // Georgia
    US: "USD", // United States
    GB: "GBP", // United Kingdom
    EU: "EUR", // Eurozone (generic)
    DE: "EUR", // Germany
    FR: "EUR", // France
    IT: "EUR", // Italy
    ES: "EUR", // Spain
    NL: "EUR", // Netherlands
    BE: "EUR", // Belgium
    AT: "EUR", // Austria
    IE: "EUR", // Ireland
    PT: "EUR", // Portugal
    GR: "EUR", // Greece
    RU: "RUB", // Russia
    TR: "TRY", // Turkey
    AM: "AMD", // Armenia
    AZ: "AZN", // Azerbaijan
    UA: "UAH", // Ukraine
    KZ: "KZT", // Kazakhstan
    BY: "BYN", // Belarus
    UZ: "UZS", // Uzbekistan
    CN: "CNY", // China
    JP: "JPY", // Japan
    IN: "INR", // India
    AU: "AUD", // Australia
    CA: "CAD", // Canada
    CH: "CHF", // Switzerland
    SE: "SEK", // Sweden
    NO: "NOK", // Norway
    DK: "DKK", // Denmark
    PL: "PLN", // Poland
    CZ: "CZK", // Czech Republic
  };

  const detectedCurrency = geo.country
    ? currencyMap[geo.country] || "GEL"
    : "GEL";

  // Sales Manager referral tracking - save ref code to cookie (7 days)
  const refCode = request.nextUrl.searchParams.get("ref");
  let response: NextResponse | null = null;

  if (refCode && refCode.startsWith("SM_")) {
    response = NextResponse.next();
    response.cookies.set("sales_ref", refCode, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      httpOnly: false, // Allow JS access for checkout
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Initialize response if not already set
  if (!response) {
    response = NextResponse.next();
  }

  // 🍪 Save geo data to cookies for client-side access
  if (geo.country) {
    response.cookies.set("user_country", geo.country, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      httpOnly: false, // Allow JS access
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    response.cookies.set("user_currency", detectedCurrency, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  if (geo.city) {
    response.cookies.set("user_city", geo.city, {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  if (geo.region) {
    response.cookies.set("user_region", geo.region, {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Save geo metadata for debugging
  response.cookies.set(
    "geo_detected_at",
    new Date().toISOString(),
    {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    }
  );

  // Skip middleware for non-relevant paths (like api, _next, static files)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/checkout") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // თუ მომხმარებელი ავტორიზებულია და publicPaths-ია, გავუშვათ
  // თუ მომხმარებელი ავტორიზებულია და publicPaths-ია, გავუშვათ
  if (isAuthenticated && publicPaths.includes(pathname)) {
    return response;
  }

  // თუ მომხმარებელი **არ არის** ავტორიზებული და სარეზერვო პაროლის გვერდზეა, უნდა შევუშვათ
  if (!isAuthenticated && publicPaths.includes(pathname)) {
    return response;
  }

  // Allow guest access to specific order pages with email parameter
  if (!isAuthenticated && pathname.match(/^\/orders\/[^\/]+$/)) {
    const email = request.nextUrl.searchParams.get("email");
    if (email) {
      return response;
    }
  }

  // Redirect unauthenticated users trying to access protected pages
  if (
    !isAuthenticated &&
    protectedPaths.some((path) => pathname.startsWith(path))
  ) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url),
    );
    // Preserve geo cookies on redirect
    const userCountry = response.cookies.get("user_country");
    const userCurrency = response.cookies.get("user_currency");
    const salesRef = response.cookies.get("sales_ref");
    
    if (userCountry) redirectResponse.cookies.set("user_country", userCountry.value, userCountry);
    if (userCurrency) redirectResponse.cookies.set("user_currency", userCurrency.value, userCurrency);
    if (salesRef) redirectResponse.cookies.set("sales_ref", salesRef.value, salesRef);
    
    return redirectResponse;
  }

  // Filter out Cloudflare cookies in development mode to prevent domain mismatch
  if (process.env.NODE_ENV === "development") {
    // Remove problematic Cloudflare cookies
    response.cookies.delete("__cf_bm");
    response.cookies.delete("__cfruid");
    response.cookies.delete("cf_clearance");
  }

  // Add performance headers in production
  const finalResponse = response;

  // Cache static assets aggressively
  if (
    pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    finalResponse.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable",
    );
  }

  // Add preload hints for critical resources
  finalResponse.headers.set(
    "Link",
    "</van-gogh.webp>; rel=preload; as=image; fetchpriority=high",
  );

  return finalResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
  runtime: 'edge', // Explicitly use Edge Runtime for Vercel geo features
};
