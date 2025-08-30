"use client";

import { useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import "@/styles/admin-categories.css"; // Import the new CSS file
import { CategoriesManager } from "./components/categories-manager";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated before rendering
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/categories");
      return;
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="responsive-container">
      <CategoriesManager />
    </div>
  );
}
