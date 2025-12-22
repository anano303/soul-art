"use client";

import { CloudinaryMigrationDashboard } from "@/modules/admin/components/cloudinary-migration";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { getUserData } from "@/lib/auth";
import { Role } from "@/types/role";

export default function AdminCloudinaryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated before rendering
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/cloudinary");
      return;
    }

    // Get user data from local storage
    const userData = getUserData();
    if (!userData) {
      router.push("/login?redirect=/admin/cloudinary");
      return;
    }

    // Check if user is admin only (not seller or blogger)
    if (userData.role !== Role.Admin) {
      console.log("User doesn't have admin permissions for Cloudinary");
      router.push("/admin/products");
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  return <CloudinaryMigrationDashboard />;
}
