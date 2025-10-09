"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserData, isLoggedIn } from "@/lib/auth";
import { Sidebar } from "lucide-react";
import { CacheRefreshManager } from "@/components/cache-refresh-manager/cache-refresh-manager";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated using the correct function
        if (!isLoggedIn()) {
          console.log("Not authenticated, redirecting to login");
          router.push("/login?redirect=/admin");
          return;
        }

        // Get user data from local storage
        const userData = getUserData();
        if (!userData) {
          console.log("No user data found, redirecting to login");
          router.push("/login?redirect=/admin");
          return;
        }

        console.log("Current user role:", userData.role);

        // Check if user has admin or seller role (case-insensitive)
        if (
          userData.role?.toLowerCase() !== "admin" &&
          userData.role?.toLowerCase() !== "seller"
        ) {
          console.log(
            "User doesn't have admin/seller permissions, role:",
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
        router.push("/login?redirect=/admin");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Disable CSS preload warnings for admin pages
    const disableCssPreloadWarnings = () => {
      // Override console.warn to filter out CSS preload warnings
      const originalWarn = console.warn;
      console.warn = function (...args) {
        const message = args.join(" ");
        if (
          !message.includes(
            "was preloaded using link preload but not used within a few seconds"
          )
        ) {
          originalWarn.apply(console, args);
        }
      };
    };

    // Run after a short delay to ensure console is ready
    setTimeout(disableCssPreloadWarnings, 100);
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
