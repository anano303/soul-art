"use client";

import { Suspense } from "react";
import { HeroSlideList } from "@/modules/admin/components/hero-slide-list";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUserData } from "@/lib/auth";
import { Role } from "@/types/role";

export default function AdminHeroSlidesPage() {
  return (
    <Suspense fallback={<div className="loading-container">იტვირთება...</div>}>
      <HeroSlidesContent />
    </Suspense>
  );
}

function HeroSlidesContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/hero-slides");
      return;
    }

    const userData = getUserData();
    if (!userData) {
      router.push("/login?redirect=/admin/hero-slides");
      return;
    }

    if (userData.role !== Role.Admin) {
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
      <HeroSlideList />
    </div>
  );
}
