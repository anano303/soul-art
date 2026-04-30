import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Bot detection — skip expensive geo operations for crawlers
function isBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|GPTBot|ClaudeBot/i.test(ua);
}

// IP Geolocation lookup — minimal, 1.5s timeout
async function getGeoFromIP(ip: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    try {
      let response = await fetch(`https://ip-api.io/json/${ip}`, {
        headers: { "User-Agent": "soul-art-geo", "Accept": "application/json" },
        signal: controller.signal,
      });

      let data = null;

      if (response.ok) {
        data = await response.json();
        const hasCountry = data.country_code || data.country || data.cc;
        if (!hasCountry) data = null; // try fallback
      }

      if (!data) {
        response = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { "User-Agent": "soul-art-geo", "Accept": "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) { clearTimeout(timeout); return null; }
        data = await response.json();
      }

      clearTimeout(timeout);
      if (data.error) return null;

      const countryCode =
        data.country_code || data.country || data.cc ||
        data.iso2 || data.countryCode || null;

      return {
        country: countryCode,
        city: data.city || null,
        region: data.region || data.state || data.province || null,
        latitude: data.latitude?.toString() || null,
        longitude: data.longitude?.toString() || null,
      };
    } catch {
      clearTimeout(timeout);
      return null;
    }
  } catch {
    return null;
  }
}

const publicPaths = [
  "/", "/login", "/register", "/forgot-password", "/reset-password",
  "/auth-callback", "/become-seller", "/forum",
  "/checkout", "/checkout/success", "/checkout/fail",
  "/donation", "/donation/success", "/donation/fail",
];

const protectedPaths = ["/profile", "/orders"];

// Currency mapping
const currencyMap: Record<string, string> = {
  GE: "GEL",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", IE: "EUR", PT: "EUR", GR: "EUR", FI: "EUR", EE: "EUR",
  LV: "EUR", LT: "EUR", SK: "EUR", SI: "EUR", CY: "EUR", MT: "EUR",
  LU: "EUR", PL: "EUR", CZ: "EUR", HU: "EUR", RO: "EUR", BG: "EUR",
  HR: "EUR", DK: "EUR", SE: "EUR", NO: "EUR", CH: "EUR", GB: "EUR",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🤖 EARLY EXIT for bots — no geo detection, no cookies, just pass through
  const ua = request.headers.get("user-agent") || "";
  if (isBot(ua)) {
    return NextResponse.next();
  }

  // Auth check
  const accessToken = request.cookies.get("access_token");
  const refreshToken = request.cookies.get("refresh_token");
  const authSession = request.cookies.get("auth_session");
  const isAuthenticated = !!(accessToken?.value || refreshToken?.value || authSession?.value);

  // 🌍 Geo Detection
  let geo = { country: null as string | null, region: null as string | null, city: null as string | null, latitude: null as string | null, longitude: null as string | null };

  const existingCountry = request.cookies.get("user_country")?.value;
  const existingCurrency = request.cookies.get("user_currency")?.value;
  const geoSource = request.cookies.get("geo_source")?.value;
  const hasRealGeo = existingCountry && existingCurrency && geoSource === "detected";

  if (hasRealGeo) {
    geo.country = existingCountry;
    geo.region = request.cookies.get("user_region")?.value || null;
    geo.city = request.cookies.get("user_city")?.value || null;
  } else {
    // Try Vercel Edge geo headers (instant, no network call)
    const vercelCountry = request.headers.get("x-vercel-ip-country");
    if (vercelCountry) {
      geo = {
        country: vercelCountry,
        city: request.headers.get("x-vercel-ip-city") ? decodeURIComponent(request.headers.get("x-vercel-ip-city")!) : null,
        region: request.headers.get("x-vercel-ip-country-region") || null,
        latitude: request.headers.get("x-vercel-ip-latitude"),
        longitude: request.headers.get("x-vercel-ip-longitude"),
      };
    } else {
      // Fallback: IP API (only if no Vercel headers available)
      const vercelIp = (request as NextRequest & { ip?: string }).ip;
      const forwardedFor = request.headers.get("x-forwarded-for");
      const realIp = request.headers.get("x-real-ip");
      const ip = vercelIp || realIp || forwardedFor?.split(",")[0].trim() || null;

      if (ip && !ip.startsWith("127.") && !ip.startsWith("::1") && ip.trim() !== "") {
        const ipGeo = await getGeoFromIP(ip);
        if (ipGeo) geo = ipGeo;
      }
    }
  }

  // 🌐 Language Detection
  const preferredLanguage = request.cookies.get("preferred_language")?.value as "en" | "ge" | undefined;
  const autoLanguage = geo.country === "GE" ? "ge" : (geo.country ? "en" : null);

  // Redirect non-Georgian users to /en
  const hasEnPrefix = pathname === "/en" || pathname.startsWith("/en/");
  const shouldBeInEnglish = !preferredLanguage && geo.country && geo.country !== "GE" && !hasEnPrefix;

  if (shouldBeInEnglish) {
    const redirectUrl = new URL(`/en${pathname}`, request.url);
    redirectUrl.search = request.nextUrl.search;
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.cookies.set("preferred_language", "en", {
      maxAge: 60 * 60 * 24 * 365, path: "/", httpOnly: false, sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return redirectResponse;
  }

  // Build response
  const detectedCurrency = geo.country ? (currencyMap[geo.country] || "USD") : "GEL";
  const refCode = request.nextUrl.searchParams.get("ref");
  const response = NextResponse.next();

  // Sales ref cookie
  if (refCode && refCode.startsWith("SM_")) {
    response.cookies.set("sales_ref", refCode, {
      maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: false, sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // 🍪 Set geo cookies (only if fresh lookup needed)
  if (!hasRealGeo) {
    const countryToSet = geo.country || "GE";
    const currencyToSet = geo.country ? detectedCurrency : "GEL";
    const sourceToSet = geo.country ? "detected" : "default";
    const cookieOpts = { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: false, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };

    response.cookies.set("user_country", countryToSet, cookieOpts);
    response.cookies.set("user_currency", currencyToSet, cookieOpts);
    response.cookies.set("geo_source", sourceToSet, cookieOpts);
    if (geo.city) response.cookies.set("user_city", geo.city, cookieOpts);
    if (geo.region) response.cookies.set("user_region", geo.region, cookieOpts);
  }

  // Set preferred language (only if not already set)
  if (!preferredLanguage && autoLanguage) {
    response.cookies.set("preferred_language", autoLanguage, {
      maxAge: 60 * 60 * 24 * 365, path: "/", httpOnly: false, sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Auth routing
  if (!isAuthenticated && pathname.match(/^\/orders\/[^\/]+$/)) {
    if (request.nextUrl.searchParams.get("email")) return response;
  }

  if (!isAuthenticated && protectedPaths.some((path) => pathname.startsWith(path))) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    const userCountry = response.cookies.get("user_country");
    const userCurrency = response.cookies.get("user_currency");
    if (userCountry) redirectResponse.cookies.set("user_country", userCountry.value, userCountry);
    if (userCurrency) redirectResponse.cookies.set("user_currency", userCurrency.value, userCurrency);
    return redirectResponse;
  }

  return response;
}

export const config = {
  // Only run on page navigations — excludes static files, images, API, etc.
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|public|api|icons|fonts|manifest|robots|sitemap|sw|workbox|.*\\..*).*)",
  ],
};
