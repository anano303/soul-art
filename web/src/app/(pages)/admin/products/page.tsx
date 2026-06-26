"use client";

import { ProductsList } from "@/modules/admin/components/products-list";
import SellerOffers from "@/modules/profile/components/seller-offers";
import "./adminProduct.css";
import { useEffect, useState } from "react";
import { isLoggedIn, getUserData } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function AdminProductsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated before rendering
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/products");
      return;
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <div className="loading-container">იტვირთება...</div>;
  }

  const role = getUserData()?.role?.toLowerCase() || "";
  const isSeller = role.includes("seller");

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
      <ProductsList />
      {/* Seller's price offers, right below their product management */}
      {isSeller && <SellerOffers />}
    </div>
  );
}
