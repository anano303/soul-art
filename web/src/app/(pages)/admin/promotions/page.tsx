"use client";

import { useEffect, useState } from "react";
import { isLoggedIn, getUserData } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Role } from "@/types/role";
import { PromotionsList } from "@/modules/admin/components/promotions-list";

export default function AdminPromotionsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/promotions");
      return;
    }
    const userData = getUserData();
    if (!userData || (userData.role !== Role.Admin && userData.role !== Role.Seller)) {
      router.push("/");
      return;
    }
    setUserRole(userData.role);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        იტვირთება...
      </div>
    );
  }

  return <PromotionsList mode={userRole === Role.Admin ? "admin" : "seller"} />;
}
