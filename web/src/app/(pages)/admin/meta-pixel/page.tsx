"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUserData } from "@/lib/auth";
import { Role } from "@/types/role";

import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { MetaPixelDashboard } from "@/modules/admin/components/meta-pixel-dashboard";

export default function MetaPixelPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Suppress CSS preload warnings immediately - comprehensive filtering
    const originalWarn = console.warn;
    console.warn = (...args) => {
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

    // Check if user is authenticated before rendering
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/meta-pixel");
      return;
    }

    // Get user data from local storage
    const userData = getUserData();
    if (!userData) {
      router.push("/login?redirect=/admin/meta-pixel");
      return;
    }

    // Check if user is admin (only admins can see Meta Pixel details)
    if (userData.role !== Role.Admin) {
      console.log("User doesn't have admin permissions for Meta Pixel");
      router.push("/admin");
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <HeartLoading size="large" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="meta-pixel-page">
      <MetaPixelDashboard />
    </div>
  );
}
