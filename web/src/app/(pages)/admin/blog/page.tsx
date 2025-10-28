"use client";

import { BlogList } from "@/modules/admin/components/blog-list";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUserData } from "@/lib/auth";
import { Role } from "@/types/role";

export default function AdminBlogPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/blog");
      return;
    }

    const userData = getUserData();
    if (!userData) {
      router.push("/login?redirect=/admin/blog");
      return;
    }

    if (userData.role !== Role.Admin) {
      console.log("User doesn't have admin permissions for blog");
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
