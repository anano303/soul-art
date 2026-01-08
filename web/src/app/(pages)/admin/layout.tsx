"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserData, isLoggedIn, storeUserData } from "@/lib/auth";
import { Sidebar } from "lucide-react";
import { CacheRefreshManager } from "@/components/cache-refresh-manager/cache-refresh-manager";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Role } from "@/types/role";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const hasAdminAccess = (role?: string | null) => {
      if (!role) return false;
      const normalized = role.toString().toLowerCase();
      return (
        normalized === Role.Admin ||
        normalized === Role.Seller ||
        normalized === Role.Blogger
      );
    };

    const checkAuth = async () => {
      try {
        // Get the current path for redirect after login
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname
            : "/admin/products";
        const redirectPath = encodeURIComponent(currentPath);

        // Check if user is authenticated using the correct function
        if (!isLoggedIn()) {
          console.log("Not authenticated, redirecting to login");
          router.push(`/login?redirect=${redirectPath}`);
          return;
        }

        // Get user data from local storage
        let userData = getUserData();

        // Always try to refresh profile to get the latest role
        // This is crucial when user becomes a seller - their role changes
        try {
          const response = await fetchWithAuth("/auth/profile");
          if (response.ok) {
            const freshUserData = await response.json();
            storeUserData(freshUserData);
            userData = freshUserData;
          }
        } catch (error) {
          console.error("Failed to refresh user profile:", error);
          // If refresh fails, fall back to cached data
        }

        if (!userData) {
          router.push(`/login?redirect=${redirectPath}`);
          return;
        }

        console.log("Current user role:", userData.role);

        if (!hasAdminAccess(userData.role)) {
          console.log(
            "User doesn't have admin/seller/blogger permissions, role:",
            userData.role
          );
          router.push("/");
          return;
        }

        // User is authenticated and authorized
        console.log("✅ Admin/Seller authentication successful");
        setAuthorized(true);
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push("/login?redirect=/admin/products");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Disable CSS preload warnings for admin pages immediately - comprehensive filtering
    const originalWarn = console.warn;
    console.warn = function (...args) {
      const message = args.join(" ");
      if (
        message.includes("preload") ||
        message.includes("CSS") ||
        message.includes("chunk") ||
        message.includes("link") ||
        message.includes("seconds") ||
        message.includes("was preloaded")
      ) {
        return;
      }
      originalWarn.apply(console, args);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">იტვირთება...</p>
      </div>
    );
  }

  if (!authorized) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="flex">
      <CacheRefreshManager />
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
