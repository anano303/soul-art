import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// IP Geolocation lookup (lightweight, works everywhere)
// Use ip-api.io as primary (CORS-friendly), fall back to ipapi.co
async function getGeoFromIP(ip: string) {
  try {
    console.log("[Middleware] Starting IP geolocation lookup for IP:", ip);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      // Try ip-api.io first (more reliable CORS)
      console.log("[Middleware] Trying ip-api.io...");
      let response = await fetch(`https://ip-api.io/json/${ip}`, {
        headers: { 
          "User-Agent": "soul-art-geo-detection",
          "Accept": "application/json",
        },
        signal: controller.signal,
      });
      
      let data = null;
      let shouldTryFallback = false;
      
      if (response.ok) {
        data = await response.json();
        // Check if the response has country data
        const hasCountry = data.country_code || data.country || data.cc;
        console.log("[Middleware] ip-api.io response ok, has country:", !!hasCountry);
        
        if (!hasCountry) {
          console.log("[Middleware] ip-api.io missing country data, trying fallback");
          shouldTryFallback = true;
        }
      } else {
        console.log("[Middleware] ip-api.io returned", response.status, "trying fallback");
        shouldTryFallback = true;
      }
      
      if (shouldTryFallback) {
        // Fallback to ipapi.co
        console.log("[Middleware] Trying ipapi.co as fallback...");
        response = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { 
            "User-Agent": "soul-art-geo-detection",
            "Accept": "application/json",
          },
          signal: controller.signal,
        });
        
        if (!response.ok) {
          clearTimeout(timeout);
          console.log("[Middleware] ipapi.co also failed with status:", response.status);
          return null;
        }
        
        data = await response.json();
      }
      
      clearTimeout(timeout);
      console.log("[Middleware] IP API full response keys:", Object.keys(data));
      console.log("[Middleware] IP API response (full):", JSON.stringify(data));
      
      // Check if ipapi returned an error
      if (data.error) {
        console.log("[Middleware] IP API returned error:", data.error, data.reason || "");
        return null;
      }
      
      // Handle both api-io and ipapi.co response formats
      // Possible field names for country: country_code, country, country_name, cc, country_capital
      const countryCode = 
        data.country_code ||    // ipapi.co format
        data.country ||         // ip-api.io format  
        data.cc ||              // Sometimes used
        null;
      
      if (!countryCode) {
        console.log("[Middleware] ❌ IP API missing country data. Available fields:", Object.keys(data).join(", "));
        console.log("[Middleware] Full response:", JSON.stringify(data));
        return null;
      }
      
      const result = {
        country: countryCode,
        city: data.city || null,
        region: data.region || data.state || null,
        latitude: data.latitude?.toString() || null,
        longitude: data.longitude?.toString() || null,
      };
      
      console.log("[Middleware] ✅ Extracted geo data:", result);
      return result;
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.log("[Middleware] ⏱️ IP geolocation timed out (network issue or blocked)");
      } else {
        console.error("[Middleware] ❌ IP API fetch failed:", fetchError instanceof Error ? fetchError.message : String(fetchError));
      }
      return null;
    }
  } catch (error) {
    console.error("[Middleware] ❌ Unexpected error in getGeoFromIP:", error instanceof Error ? error.message : String(error));
    return null;
  }
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

export async function middleware(request: NextRequest) {
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

  // 🌍 Geolocation Detection - Use IP-based (respects VPN)
  // Skip Vercel Edge geo as it detects real location, not VPN location
  
  let geo = {
    country: null,
    region: null,
    city: null,
    latitude: null,
    longitude: null,
  };

  // If Vercel Edge geo is not available, use IP-based geolocation
  if (!geo.country) {
    // Get IP address - Vercel Edge provides request.ip in production
    const vercelIp = (request as NextRequest & { ip?: string }).ip;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    
    // Priority: Vercel's request.ip > x-real-ip > x-forwarded-for first IP
    const ip = vercelIp || realIp || forwardedFor?.split(",")[0].trim() || null;
    
    console.log("[Middleware] Detecting geo via IP (Vercel Edge unavailable or development mode)");
    console.log("[Middleware] request.ip (Vercel):", vercelIp);
    console.log("[Middleware] x-forwarded-for:", forwardedFor);
    console.log("[Middleware] x-real-ip:", realIp);
    console.log("[Middleware] Final IP to use:", ip);
    
    // Only attempt IP lookup if we have a valid IP
    if (ip && !ip.startsWith("127.") && !ip.startsWith("::1") && ip.trim() !== "") {
      console.log("[Middleware] IP is valid, attempting geo lookup");
      const ipGeo = await getGeoFromIP(ip);
      if (ipGeo && ipGeo.country) {
        console.log("[Middleware] ✅ IP geo lookup succeeded:", ipGeo.country);
        geo = ipGeo;
      } else {
        console.log("[Middleware] ❌ IP geo lookup returned null or no country");
        geo = { country: null, region: null, city: null, latitude: null, longitude: null };
      }
    } else {
      console.log("[Middleware] ❌ IP is invalid or localhost:", ip, "- using defaults");
      geo = { country: null, region: null, city: null, latitude: null, longitude: null };
    }
  }

  // Debug logging (only in development or for geo-test page)
  if (process.env.NODE_ENV === 'development' || pathname.includes('/geo-test')) {
    console.log('[Middleware] Processing:', pathname);
    console.log('[Middleware] Using IP-based geo (skipping Vercel Edge to respect VPN)');
    console.log('[Middleware] Geo data:', geo);
  }

  // 🌐 Language Detection & Redirect
  const preferredLanguage = request.cookies.get("preferred_language")?.value as "en" | "ge" | undefined;
  
  // Only auto-detect language if geo was successfully detected
  // If geo is null, don't set a language preference - let it be manually chosen
  const autoLanguage = geo.country === "GE" ? "ge" : (geo.country ? "en" : null);
  
  // Debug logging for language detection
  if (pathname.includes('/geo-test')) {
    console.log('[Middleware] Preferred language:', preferredLanguage);
    console.log('[Middleware] Auto-detected language:', autoLanguage);
    console.log('[Middleware] Country:', geo.country);
    console.log('[Middleware] Geo detection success:', !!geo.country);
  }

  // Check if we need to redirect to /en for non-Georgian users without a language preference
  // Only redirect if we successfully detected the country AND it's not Georgia AND user has no preference
  const hasEnPrefix = pathname === "/en" || pathname.startsWith("/en/");
  const shouldBeInEnglish = !preferredLanguage && geo.country && geo.country !== "GE" && !hasEnPrefix;
  
  if (pathname.includes('/geo-test') || pathname === '/' || pathname === '') {
    console.log('[Middleware] === REDIRECT DECISION ===');
    console.log('[Middleware] pathname:', pathname);
    console.log('[Middleware] preferredLanguage:', preferredLanguage, '→ !preferredLanguage:', !preferredLanguage);
    console.log('[Middleware] geo.country:', geo.country, '→ truthy:', !!geo.country);
    console.log('[Middleware] geo.country !== "GE":', geo.country !== "GE");
    console.log('[Middleware] hasEnPrefix:', hasEnPrefix, '→ !hasEnPrefix:', !hasEnPrefix);
    console.log('[Middleware] shouldBeInEnglish:', shouldBeInEnglish);
    console.log('[Middleware] Will redirect:', shouldBeInEnglish && !pathname.startsWith("/api") && !pathname.startsWith("/_next"));
  }
  
  if (shouldBeInEnglish && !hasEnPrefix && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    // User is detected outside Georgia with no preferred language → redirect to /en
    console.log('[Middleware] Redirecting to /en for non-Georgian user (country:', geo.country, ')');
    const redirectUrl = new URL(`/en${pathname}`, request.url);
    redirectUrl.search = request.nextUrl.search;
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Set preferred language cookie on redirect
    redirectResponse.cookies.set("preferred_language", "en", {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return redirectResponse;
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
  // Always set cookies, use defaults if geo detection failed
  const countryToSet = geo.country || "GE"; // Default to Georgia only if detection failed
  const currencyToSet = geo.country ? detectedCurrency : "GEL"; // Default to GEL only if detection failed
  
  console.log("[Middleware] 🍪 Setting cookies - Country:", countryToSet, "(detected:", geo.country, "), Currency:", currencyToSet);
  
  response.cookies.set("user_country", countryToSet, {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    httpOnly: false, // Allow JS access
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  response.cookies.set("user_currency", currencyToSet, {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

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

  // 🌐 Set preferred language cookie (only if not already set by user and geo was detected)
  if (!preferredLanguage && autoLanguage) {
    response.cookies.set("preferred_language", autoLanguage, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      httpOnly: false, // Allow JS access
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

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
