import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/forum",
  "/checkout",
  "/checkout/success",
  "/checkout/fail",
];
const protectedPaths = [
  "/profile",
  "/orders",
  "/admin",
  "/admin/products",
  "/admin/products/create",
  "/admin/products/[id]/edit", // დავამატოთ პროდუქტის რედაქტირების გზა
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for authentication tokens - Next.js 16 compatible way
  const accessToken = request.cookies.get("access_token");
  const refreshToken = request.cookies.get("refresh_token");
  const hasTokens = !!(accessToken?.value || refreshToken?.value);
  const isAuthenticated = hasTokens;

  // Debug logging for admin paths (remove in production after fixing)
  if (pathname.startsWith("/admin")) {
    console.log("[Middleware Debug]", {
      pathname,
      hasAccessToken: !!accessToken?.value,
      hasRefreshToken: !!refreshToken?.value,
      isAuthenticated,
      allCookies: request.cookies.getAll().map(c => c.name)
    });
  }

  // Skip middleware for non-relevant paths (like api, _next, static files)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/checkout") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // თუ მომხმარებელი ავტორიზებულია და publicPaths-ია, გავუშვათ
  if (isAuthenticated && publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // თუ მომხმარებელი **არ არის** ავტორიზებული და სარეზერვო პაროლის გვერდზეა, უნდა შევუშვათ
  if (!isAuthenticated && publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow guest access to specific order pages with email parameter
  if (!isAuthenticated && pathname.match(/^\/orders\/[^\/]+$/)) {
    const email = request.nextUrl.searchParams.get("email");
    if (email) {
      return NextResponse.next();
    }
  }

  // Redirect unauthenticated users trying to access protected pages
  if (
    !isAuthenticated &&
    protectedPaths.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Filter out Cloudflare cookies in development mode to prevent domain mismatch
  if (process.env.NODE_ENV === "development") {
    const response = NextResponse.next();

    // Remove problematic Cloudflare cookies
    response.cookies.delete("__cf_bm");
    response.cookies.delete("__cfruid");
    response.cookies.delete("cf_clearance");

    return response;
  }

  // Add performance headers in production
  const response = NextResponse.next();

  // Cache static assets aggressively
  if (
    pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  // Add preload hints for critical resources
  response.headers.set(
    "Link",
    "</van-gogh.webp>; rel=preload; as=image; fetchpriority=high"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
