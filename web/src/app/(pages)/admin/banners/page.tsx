"use client";

import { BannerList } from "@/modules/admin/components/banner-list";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { getUserData } from "@/lib/auth";
import { Role } from "@/types/role";

export default function AdminBannersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated before rendering
    if (!isAuthenticated()) {
      router.push("/login?redirect=/admin/banners");
      return;
    }

    // Get user data from local storage
    const userData = getUserData();
    if (!userData) {
      router.push("/login?redirect=/admin/banners");
      return;
    }

    // Check if user is admin, redirect sellers
    if (userData.role !== Role.Admin) {
      console.log("User doesn't have admin permissions for banners");
      router.push("/admin/products");
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  return (
    <div
      className="responsive-container"
      style={{
        maxWidth: "90%",
        margin: "0 auto",
        overflowX: "auto",
        width: "100%",
      }}
    >
      <BannerList />
    </div>
  );
}
