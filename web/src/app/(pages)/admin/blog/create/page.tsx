"use client";

import { BlogForm } from "@/modules/admin/components/blog-form";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUserData } from "@/lib/auth";
import { Role } from "@/types/role";

export default function AdminBlogCreatePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hasBlogManagerAccess = (role?: string | null) => {
      if (!role) return false;
      const normalized = role.toString().toLowerCase();
      return normalized === Role.Admin || normalized === Role.Blogger;
    };

    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/blog/create");
      return;
    }

    const userData = getUserData();
    if (!userData) {
      router.push("/login?redirect=/admin/blog/create");
      return;
    }

    if (!hasBlogManagerAccess(userData.role)) {
      console.log("Only admins/bloggers can create blog posts");
      router.push("/admin/blog");
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
      }}
    >
      <BlogForm />
    </div>
  );
}
