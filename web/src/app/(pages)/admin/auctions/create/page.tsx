"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreateAuctionForm } from "@/modules/auctions/components/create-auction-form";
import { useLanguage } from "@/hooks/LanguageContext";
import "../admin-auctions.css";

export default function AdminCreateAuctionPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="admin-auctions-container" style={{ maxWidth: "960px" }}>
      <div className="admin-auctions-header" style={{ marginBottom: "1.5rem" }}>
        <h1 className="admin-auctions-title">
          {t("admin.auctionsCreate.title")}
        </h1>
        <p className="admin-auctions-subtitle">
          {t("admin.auctionsCreate.subtitle")}
        </p>
        <Link href="/admin/auctions" className="admin-back-link">
          ← {t("admin.auctionsCreate.back")}
        </Link>
      </div>
      <CreateAuctionForm
        mode="admin"
        onSuccess={() => router.push("/admin/auctions")}
      />
    </div>
  );
}
