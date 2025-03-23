import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/forum",
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
  const hasTokens =
    request.cookies.get("access_token") || request.cookies.get("refresh_token");
  const isAuthenticated = Boolean(hasTokens); // ✅ Boolean() ვამატებთ, რომ სწორი იყოს

  console.log("📌 Pathname:", pathname);
  console.log("🔐 Is Authenticated:", isAuthenticated);

  // Skip middleware for non-relevant paths (like api, _next, static files)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    console.log("➡️ Skipping middleware for:", pathname);
    return NextResponse.next();
  }

  // თუ მომხმარებელი ავტორიზებულია და publicPaths-ია, გავუშვათ
  if (isAuthenticated && publicPaths.includes(pathname)) {
    console.log("✅ Authenticated user accessing public path:", pathname);
    return NextResponse.next();
  }

  // თუ მომხმარებელი **არ არის** ავტორიზებული და სარეზერვო პაროლის გვერდზეა, უნდა შევუშვათ
  if (!isAuthenticated && publicPaths.includes(pathname)) {
    console.log("🛑 Unauthenticated user accessing public path:", pathname);
    return NextResponse.next();
  }

  // Redirect unauthenticated users trying to access protected pages
  if (
    !isAuthenticated &&
    protectedPaths.some((path) => {
      const isProtected = pathname.startsWith(path);
      console.log(`Checking path ${pathname} against ${path}: ${isProtected}`);
      return isProtected;
    })
  ) {
    console.log("🚨 Redirecting unauthenticated user to /login from:", pathname);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
