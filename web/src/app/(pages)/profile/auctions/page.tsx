"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { toast } from "react-hot-toast";
import "./seller-auctions.css";

interface AuctionSummary {
  _id: string;
  title: string;
  currentPrice: number;
  startingPrice: number;
  endDate: string;
  status: "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED";
  totalBids: number;
  createdAt: string;
}

interface PaginationInfo {
  current: number;
  pages: number;
  total: number;
}

interface SellerAuctionsResponse {
  auctions: AuctionSummary[];
  pagination: PaginationInfo;
}

export default function SellerAuctionsPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<SellerAuctionsResponse>(
        "/auctions/seller/my-auctions",
        {
          params: {
            page: 1,
            limit: 50,
          },
        }
      );

      setAuctions(response.data.auctions || []);
      setPagination(response.data.pagination || null);
    } catch (error: any) {
      console.error("Failed to load seller auctions", error);
      toast.error(
        error?.response?.data?.message ||
          t("sellerAuctions.errors.load") ||
          "Failed to load auctions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      const role = user?.role?.toString().toUpperCase();
      if (role !== "SELLER") {
        router.replace("/profile");
        return;
      }
      fetchAuctions();
    }
  }, [isLoading, user, router]);

  const locale = language === "en" ? "en-US" : "ka-GE";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "GEL",
    minimumFractionDigits: 2,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="seller-auctions-page">
      <div className="seller-auctions-header">
        <div>
          <h1 className="seller-auctions-title">{t("sellerAuctions.title")}</h1>
          <p className="seller-auctions-subtitle">
            {t("sellerAuctions.subtitle")}
          </p>
        </div>
        <div className="seller-auctions-actions">
          <Link href="/profile/auctions/create" className="primary-link">
            {t("sellerAuctions.actions.create")}
          </Link>
          <button
            type="button"
            className="secondary-button"
            onClick={fetchAuctions}
            disabled={loading}
          >
            {loading
              ? t("sellerAuctions.actions.refreshing")
              : t("sellerAuctions.actions.refresh")}
          </button>
        </div>
      </div>

      {auctions.length === 0 ? (
        <div className="empty-auctions">
          <h3>{t("sellerAuctions.empty.title")}</h3>
          <p>{t("sellerAuctions.empty.description")}</p>
        </div>
      ) : (
        <div className="auctions-list-card">
          <div className="auctions-list-header">
            <span>{t("sellerAuctions.table.title")}</span>
            <span>{t("sellerAuctions.table.status")}</span>
            <span>{t("sellerAuctions.table.currentPrice")}</span>
            <span>{t("sellerAuctions.table.bids")}</span>
            <span>{t("sellerAuctions.table.endDate")}</span>
          </div>
          <div className="auctions-list-body">
            {auctions.map((auction) => (
              <div key={auction._id} className="auction-row">
                <div>
                  <div className="auction-title">{auction.title}</div>
                  <div className="auction-meta">
                    {t("sellerAuctions.table.created", {
                      date: dateFormatter.format(new Date(auction.createdAt)),
                    })}
                  </div>
                </div>
                <div>
                  <span
                    className={`auction-status-badge status-${auction.status.toLowerCase()}`}
                  >
                    {t(`auctions.status.${auction.status.toLowerCase()}`)}
                  </span>
                </div>
                <div className="value-strong">
                  {currencyFormatter.format(auction.currentPrice || 0)}
                  <div className="auction-meta">
                    {t("sellerAuctions.table.starting", {
                      price: currencyFormatter.format(auction.startingPrice),
                    })}
                  </div>
                </div>
                <div className="value-strong">{auction.totalBids}</div>
                <div>
                  <div className="auction-meta">
                    {dateFormatter.format(new Date(auction.endDate))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pagination && (
        <div className="auction-meta" style={{ color: "#718096" }}>
          {t("sellerAuctions.meta.summary", {
            total: pagination.total,
          })}
        </div>
      )}
    </div>
  );
}
