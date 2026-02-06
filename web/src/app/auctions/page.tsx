"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { useTheme } from "@/hooks/ThemeContext";
import { Moon, Sun, Gavel } from "lucide-react";

import "./auctions.css";
import { AuctionCard, AuctionFilters } from "@/modules/auctions/components";
import Pagination from "@/components/ui/pagination";

interface Auction {
  _id: string;
  title: string;
  description: string;
  mainImage: string;
  artworkType: "ORIGINAL" | "REPRODUCTION";
  dimensions: string;
  material: string;
  startingPrice: number;
  currentPrice: number;
  minimumBidIncrement: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED" | "SCHEDULED";
  totalBids: number;
  seller: {
    firstName?: string;
    lastName?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
  };
  currentWinner?: {
    firstName?: string;
    lastName?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
  };
}

interface AuctionResponse {
  auctions: Auction[];
  pagination: {
    current: number;
    pages: number;
    total: number;
  };
}

function AuctionsContent() {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "SCHEDULED">("ACTIVE");
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState({
    artworkType: searchParams?.get("artworkType") || "",
    material: searchParams?.get("material") || "",
    dimensions: searchParams?.get("dimensions") || "",
    minPrice: searchParams?.get("minPrice") || "",
    maxPrice: searchParams?.get("maxPrice") || "",
  });

  const fetchAuctions = async (
    page: number = 1,
    status: string = activeTab,
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
        status: status,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== ""),
        ),
      });

      const response = await apiClient.get<AuctionResponse>(
        `/auctions?${params.toString()}`,
      );

      // For scheduled auctions, filter to only show those starting within 3 days
      let filteredAuctions = response.data.auctions;
      if (status === "SCHEDULED") {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        filteredAuctions = response.data.auctions.filter((auction) => {
          const startDate = new Date(auction.startDate);
          return startDate <= threeDaysFromNow;
        });
      }

      setAuctions(filteredAuctions);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to fetch auctions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions(1, activeTab);
  }, [filters, activeTab]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    fetchAuctions(page, activeTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTabChange = (tab: "ACTIVE" | "SCHEDULED") => {
    setActiveTab(tab);
    setPagination({ current: 1, pages: 1, total: 0 });
  };

  return (
    <div className="auctions-container">
      <div className="auctions-header">
        <div className="header-top-row">
          <h1 className="auctions-title">
            <span className="title-text">Soul Art</span>
            <span className="title-auctions">
              <Gavel className="gavel-icon" />
              Auctions
            </span>
          </h1>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "light" ? "Dark Mode" : "Light Mode"}
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
        <p className="auctions-subtitle">{t("auctions.subtitle")}</p>

        {/* Status Tabs */}
        <div className="auctions-tabs">
          <button
            className={`auction-tab ${activeTab === "ACTIVE" ? "active" : ""}`}
            onClick={() => handleTabChange("ACTIVE")}
          >
            <span className="tab-icon">🔥</span>
            {t("auctions.tabActive") || "აქტიური"}
          </button>
          <button
            className={`auction-tab ${activeTab === "SCHEDULED" ? "active" : ""}`}
            onClick={() => handleTabChange("SCHEDULED")}
          >
            <span className="tab-icon">📅</span>
            {t("auctions.tabScheduled") || "მალე დაიწყება"}
          </button>
        </div>
      </div>

      <div className="auctions-content">
        <aside className="auctions-sidebar">
          <AuctionFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </aside>

        <main className="auctions-main">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>{t("auctions.loading")}</p>
            </div>
          ) : auctions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {activeTab === "SCHEDULED" ? "📅" : "🎨"}
              </div>
              <h3>{t("auctions.noAuctions")}</h3>
              <p>
                {activeTab === "SCHEDULED"
                  ? t("auctions.noScheduledDesc") ||
                    "უახლოეს 3 დღეში დაგეგმილი აუქციონები არ არის"
                  : t("auctions.noAuctionsDesc")}
              </p>
            </div>
          ) : (
            <>
              <div className="auctions-grid">
                {auctions.map((auction) => (
                  <AuctionCard key={auction._id} auction={auction} />
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="auctions-pagination">
                  <Pagination
                    currentPage={pagination.current}
                    totalPages={pagination.pages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AuctionsPage() {
  return (
    <Suspense
      fallback={
        <div className="auctions-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>იტვირთება...</p>
          </div>
        </div>
      }
    >
      <AuctionsContent />
    </Suspense>
  );
}
