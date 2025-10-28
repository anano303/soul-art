"use client";

import { BlogList } from "@/modules/admin/components/blog-list";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserData, storeUserData } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Role } from "@/types/role";

export default function AdminBlogPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hasBlogAccess = (role?: string | null) => {
      if (!role) return false;
      const normalized = role.toString().toLowerCase();
      return normalized === Role.Admin || normalized === Role.Blogger;
    };

    const verifyAccess = async () => {
      const hasLocalAccess = () => {
        const cachedUser = getUserData();
        return hasBlogAccess(cachedUser?.role);
      };

      if (hasLocalAccess()) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetchWithAuth("/auth/profile");
        const freshUser = await response.json();

        if (freshUser) {
          storeUserData(freshUser);

          if (hasBlogAccess(freshUser.role)) {
            if (isMounted) {
              setIsLoading(false);
            }
            return;
          }
        }
      } catch (error) {
        console.error("Failed to verify blog admin access:", error);
        router.push("/login?redirect=/admin/blog");
        return;
      }

      router.push("/");
    };

    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  return (
    <div
      style={{
        maxWidth: "100%",
        margin: "0 auto",
        padding: "2rem 0",
      }}
    >
      <BlogList />
    </div>
  );
}
