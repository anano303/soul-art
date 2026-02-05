"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreateAuctionForm } from "@/modules/auctions/components/create-auction-form";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";

export default function SellerCreateAuctionPage() {
  const { t } = useLanguage();
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      const role = user?.role?.toString().toUpperCase();
      if (role !== "SELLER") {
        router.replace("/profile");
      }
    }
  }, [isLoading, user, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {t("sellerAuctions.create.title")}
        </h1>
        <p className="text-slate-600 max-w-2xl">
          {t("sellerAuctions.create.subtitle")}
        </p>
      </div>
      <CreateAuctionForm
        mode="seller"
        onSuccess={() => router.push("/profile/auctions")}
      />
    </div>
  );
}
