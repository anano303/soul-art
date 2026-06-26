"use client";

import { PriceOffersList } from "@/modules/admin/components/price-offers-list";
import { useEffect, useState } from "react";
import { isLoggedIn, getUserData } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Role } from "@/types/role";

export default function AdminPriceOffersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/price-offers");
      return;
    }
    const userData = getUserData();
    if (!userData || userData.role !== Role.Admin) {
      router.push("/");
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
      style={{ maxWidth: "95%", margin: "0 auto", width: "100%" }}
    >
      <PriceOffersList />
    </div>
  );
}
