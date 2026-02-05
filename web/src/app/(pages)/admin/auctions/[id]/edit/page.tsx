"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { CreateAuctionForm } from "@/modules/auctions/components/create-auction-form";
import { useLanguage } from "@/hooks/LanguageContext";
import { apiClient } from "@/lib/axios";
import { toast } from "react-hot-toast";
import "../../admin-auctions.css";

interface AuctionData {
  _id: string;
  title: string;
  description: string;
  artworkType: "ORIGINAL" | "REPRODUCTION";
  dimensions: string;
  material: string;
  mainImage: string;
  additionalImages?: string[];
  startingPrice: number;
  minimumBidIncrement: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  deliveryDays: number;
  deliveryInfo: string;
  seller: {
    _id: string;
  };
  status: string;
}

export default function AdminEditAuctionPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const auctionId = params.id as string;

  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const response = await apiClient.get(`/auctions/${auctionId}`);
        setAuction(response.data);
      } catch (error) {
        console.error("Failed to fetch auction:", error);
        toast.error(t("admin.auctionLoadError") || "Failed to load auction");
        router.push("/admin/auctions");
      } finally {
        setLoading(false);
      }
    };

    if (auctionId) {
      fetchAuction();
    }
  }, [auctionId, router, t]);

  if (loading) {
    return (
      <div className="admin-auctions-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t("admin.loading")}</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="admin-auctions-container">
        <div className="empty-state">
          <h3>{t("admin.auctionNotFound") || "Auction not found"}</h3>
          <Link href="/admin/auctions" className="admin-back-link">
            ← {t("admin.auctionsCreate.back")}
          </Link>
        </div>
      </div>
    );
  }

  // Format dates for the form
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const formatTimeForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toTimeString().slice(0, 5);
  };

  const initialData = {
    title: auction.title,
    description: auction.description,
    artworkType: auction.artworkType,
    dimensions: auction.dimensions,
    material: auction.material,
    mainImage: auction.mainImage,
    additionalImages: auction.additionalImages || [],
    startingPrice: auction.startingPrice,
    minimumBidIncrement: auction.minimumBidIncrement,
    startDate: formatDateForInput(auction.startDate),
    startTime: auction.startTime || formatTimeForInput(auction.startDate),
    endDate: formatDateForInput(auction.endDate),
    endTime: auction.endTime || formatTimeForInput(auction.endDate),
    deliveryDays: auction.deliveryDays,
    deliveryInfo: auction.deliveryInfo,
    sellerId: auction.seller?._id,
  };

  return (
    <div className="admin-auctions-container" style={{ maxWidth: "960px" }}>
      <div className="admin-auctions-header" style={{ marginBottom: "1.5rem" }}>
        <h1 className="admin-auctions-title">
          {t("admin.auctionsEdit.title") || "Edit Auction"}
        </h1>
        <p className="admin-auctions-subtitle">
          {t("admin.auctionsEdit.subtitle") || "Modify auction details"}
        </p>
        <Link href="/admin/auctions" className="admin-back-link">
          ← {t("admin.auctionsCreate.back")}
        </Link>
      </div>
      <CreateAuctionForm
        mode="admin"
        variant="reschedule"
        auctionId={auctionId}
        initialData={initialData}
        lockedSellerId={auction.seller?._id}
        onSuccess={() => router.push("/admin/auctions")}
      />
    </div>
  );
}
