import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  let { pathname } = request.nextUrl;

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

  // Skip middleware for non-relevant paths (like api, _next, static files)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/checkout") ||
    pathname.includes(".")
  ) {
    return response || NextResponse.next();
  }

  // თუ მომხმარებელი ავტორიზებულია და publicPaths-ია, გავუშვათ
  // თუ მომხმარებელი ავტორიზებულია და publicPaths-ია, გავუშვათ
  if (isAuthenticated && publicPaths.includes(pathname)) {
    return response || NextResponse.next();
  }

  // თუ მომხმარებელი **არ არის** ავტორიზებული და სარეზერვო პაროლის გვერდზეა, უნდა შევუშვათ
  if (!isAuthenticated && publicPaths.includes(pathname)) {
    return response || NextResponse.next();
  }

  // Allow guest access to specific order pages with email parameter
  if (!isAuthenticated && pathname.match(/^\/orders\/[^\/]+$/)) {
    const email = request.nextUrl.searchParams.get("email");
    if (email) {
      return response || NextResponse.next();
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
    // Preserve sales_ref cookie on redirect
    if (response) {
      const salesRef = response.cookies.get("sales_ref");
      if (salesRef) {
        redirectResponse.cookies.set("sales_ref", salesRef.value, {
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
          httpOnly: false,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }
    return redirectResponse;
  }

  // Filter out Cloudflare cookies in development mode to prevent domain mismatch
  if (process.env.NODE_ENV === "development") {
    const devResponse = response || NextResponse.next();

    // Remove problematic Cloudflare cookies
    devResponse.cookies.delete("__cf_bm");
    devResponse.cookies.delete("__cfruid");
    devResponse.cookies.delete("cf_clearance");

    return devResponse;
  }

  // Add performance headers in production
  const finalResponse = response || NextResponse.next();

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
};
