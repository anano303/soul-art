"use client";

import { ProductsList } from "@/modules/admin/components/products-list";
import "./adminProduct.css";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export default function AdminProductsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated before rendering
    if (!isAuthenticated()) {
      router.push('/login?redirect=/admin/products');
      return;
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  return (
    <div className="admin-products-container">
      <div className="scrollable-container">
        <div className="products-content">
          <ProductsList />
        </div>
      </div>
    </div>
  );
}
