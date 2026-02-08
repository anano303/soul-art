"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { toast } from "react-hot-toast";
import "./seller-auctions.css";

interface AuctionSummary {
  _id: string;
  title: string;
  mainImage?: string;
  currentPrice: number;
  startingPrice: number;
  endDate: string;
  status: "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED" | "SCHEDULED";
  isPaid?: boolean;
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
      console.log("Fetching seller auctions...");
      const response = await apiClient.get<SellerAuctionsResponse>(
        "/auctions/seller/my-auctions",
        {
          params: {
            page: 1,
            limit: 50,
          },
        },
      );

      console.log("API Response:", response.data);
      console.log("Auctions count:", response.data.auctions?.length || 0);

      setAuctions(response.data.auctions || []);
      setPagination(response.data.pagination || null);
    } catch (error: any) {
      console.error("Failed to load seller auctions", error);
      console.error("Error response:", error?.response?.data);
      console.error("Error status:", error?.response?.status);
      toast.error(
        error?.response?.data?.message ||
          t("sellerAuctions.errors.load") ||
          "Failed to load auctions",
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteAuction = async (auctionId: string) => {
    if (
      !confirm(
        language === "en"
          ? "Are you sure you want to delete this auction?"
          : "დარწმუნებული ხართ, რომ გსურთ ამ აუქციონის წაშლა?",
      )
    )
      return;

    try {
      await apiClient.delete(`/auctions/${auctionId}`);
      toast.success(
        language === "en"
          ? "Auction deleted successfully"
          : "აუქციონი წაიშალა წარმატებით",
      );
      fetchAuctions();
    } catch (error: any) {
      console.error("Failed to delete auction:", error);
      toast.error(
        error?.response?.data?.message ||
          (language === "en"
            ? "Failed to delete auction"
            : "აუქციონის წაშლა ვერ მოხერხდა"),
      );
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      const role = user?.role?.toString().toLowerCase();
      console.log("User role for auctions page:", role, user);
      // Allow both "seller" and "seller_sales_manager" roles
      const isSellerRole = role === "seller" || role === "seller_sales_manager";
      if (!isSellerRole) {
        console.log("Not a seller role, redirecting...");
        router.replace("/profile");
        return;
      }
      fetchAuctions();
    }
  }, [isLoading, user, router]);

  // Show loading while user is loading
  if (isLoading) {
    return (
      <div className="seller-auctions-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>იტვირთება...</p>
        </div>
      </div>
    );
  }

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

  // Calculate stats
  const activeCount = auctions.filter((a) => a.status === "ACTIVE").length;
  const endedCount = auctions.filter((a) => a.status === "ENDED").length;
  const pendingCount = auctions.filter((a) => a.status === "PENDING").length;

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
          <Link href="/auctions/create" className="primary-link">
            ➕ {t("sellerAuctions.actions.create")}
          </Link>
          <button
            type="button"
            className="secondary-button"
            onClick={fetchAuctions}
            disabled={loading}
          >
            🔄{" "}
            {loading
              ? t("sellerAuctions.actions.refreshing")
              : t("sellerAuctions.actions.refresh")}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="seller-auctions-stats">
        <div className="stat-card">
          <div className="stat-number">{auctions.length}</div>
          <div className="stat-label">სულ აუქციონი</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{activeCount}</div>
          <div className="stat-label">აქტიური</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{endedCount}</div>
          <div className="stat-label">დასრულებული</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{pendingCount}</div>
          <div className="stat-label">მოლოდინში</div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <div className="info-banner-icon">💡</div>
        <div className="info-banner-content">
          <strong>მნიშვნელოვანი:</strong> აუქციონზე გადახდის შემდეგ, შეკვეთა
          ავტომატურად აისახება ადმინ პანელის შეკვეთების სექციაში და თქვენ
          მიიღებთ შეტყობინებას. თქვენი შემოსავალი ჩაირიცხება ბალანსზე მიწოდების
          დასრულების შემდეგ.
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>აუქციონების ჩატვირთვა...</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="empty-auctions">
          <h3>{t("sellerAuctions.empty.title")}</h3>
          <p>{t("sellerAuctions.empty.description")}</p>
        </div>
      ) : (
        <div className="auctions-list-card">
          <div className="auctions-table-wrapper">
            <div className="auctions-list-header">
              <span>სურათი</span>
              <span>{t("sellerAuctions.table.title")}</span>
              <span>{t("sellerAuctions.table.status")}</span>
              <span>გადახდა</span>
              <span>{t("sellerAuctions.table.currentPrice")}</span>
              <span>{t("sellerAuctions.table.bids")}</span>
              <span>{t("sellerAuctions.table.endDate")}</span>
              <span>{language === "en" ? "Actions" : "მოქმედებები"}</span>
            </div>
            <div className="auctions-list-body">
              {auctions.map((auction) => (
                <div key={auction._id} className="auction-row">
                  <div className="auction-image-cell">
                    <Link href={`/auctions/${auction._id}`}>
                      <Image
                        src={auction.mainImage || "/placeholder-artwork.jpg"}
                        alt={auction.title}
                        width={55}
                        height={55}
                        className="auction-thumbnail"
                        unoptimized
                      />
                    </Link>
                  </div>
                  <div>
                    <Link
                      href={`/auctions/${auction._id}`}
                      className="auction-title-link"
                    >
                      <div className="auction-title">{auction.title}</div>
                    </Link>
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
                  <div>
                    {auction.status === "ENDED" ? (
                      auction.isPaid ? (
                        <span className="payment-badge paid">✓ გადახდილი</span>
                      ) : (
                        <span className="payment-badge unpaid">გადაუხდელი</span>
                      )
                    ) : (
                      <span className="payment-badge na">—</span>
                    )}
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
                  <div className="auction-actions">
                    {/* რედაქტირება - დისაბლ იყოს თუ ფსონი აქვს */}
                    {auction.totalBids > 0 ? (
                      <button
                        className="action-btn edit-btn disabled"
                        disabled
                        title={
                          language === "en"
                            ? "Cannot edit auction with bids"
                            : "აუქციონის რედაქტირება შეუძლებელია ფსონების არსებობისას"
                        }
                      >
                        ✏️
                      </button>
                    ) : (
                      <Link
                        href={`/profile/auctions/${auction._id}/edit`}
                        className="action-btn edit-btn"
                        title={
                          language === "en"
                            ? "Edit auction"
                            : "აუქციონის რედაქტირება"
                        }
                      >
                        ✏️
                      </Link>
                    )}
                    {/* წაშლა - დამალული იყოს თუ ფსონი აქვს */}
                    {auction.totalBids === 0 && (
                      <button
                        onClick={() => deleteAuction(auction._id)}
                        className="action-btn delete-btn"
                        title={
                          language === "en"
                            ? "Delete auction"
                            : "აუქციონის წაშლა"
                        }
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {pagination && pagination.total > 0 && (
        <div className="pagination-info">სულ {pagination.total} აუქციონი</div>
      )}
    </div>
  );
}
