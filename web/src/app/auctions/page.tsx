"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { useTheme } from "@/hooks/ThemeContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { Moon, Sun, Gavel, Plus } from "lucide-react";
import { BecomeSellerModal } from "@/components/become-seller-modal/become-seller-modal";

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
    name?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    storeName?: string;
  };
  currentWinner?: {
    firstName?: string;
    lastName?: string;
    name?: string;
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
  const { t, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "SCHEDULED" | "ENDED">(
    "ACTIVE",
  );
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

  // Load saved tab from localStorage or URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "").toUpperCase();
    const savedTab = localStorage.getItem("auctionsActiveTab");

    if (hash === "ACTIVE" || hash === "SCHEDULED" || hash === "ENDED") {
      setActiveTab(hash as "ACTIVE" | "SCHEDULED" | "ENDED");
    } else if (
      savedTab === "ACTIVE" ||
      savedTab === "SCHEDULED" ||
      savedTab === "ENDED"
    ) {
      setActiveTab(savedTab as "ACTIVE" | "SCHEDULED" | "ENDED");
    }
  }, []);

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

  const handleTabChange = (tab: "ACTIVE" | "SCHEDULED" | "ENDED") => {
    setActiveTab(tab);
    setPagination({ current: 1, pages: 1, total: 0 });
    // Save to localStorage and update URL hash
    localStorage.setItem("auctionsActiveTab", tab);
    window.history.replaceState(null, "", `#${tab.toLowerCase()}`);
  };

  const isSeller = user?.role?.toString().toUpperCase() === "SELLER";
  const isAdmin = user?.role?.toString().toLowerCase() === "admin";
  const isAuctionAdmin =
    user?.role?.toString().toLowerCase() === "auction_admin";
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);

  // All authorized roles use the same unified create auction page
  const canCreateAuction = isSeller || isAdmin || isAuctionAdmin;
  const createAuctionLink = canCreateAuction ? "/auctions/create" : null;

  return (
    <>
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
            <div className="header-actions">
              {canCreateAuction && createAuctionLink ? (
                <Link
                  href={createAuctionLink}
                  className="create-auction-btn"
                  title={
                    language === "en" ? "Create Auction" : "აუქციონის შექმნა"
                  }
                >
                  <Plus size={18} />
                  <span>
                    {language === "en" ? "Create Auction" : "აუქციონის შექმნა"}
                  </span>
                </Link>
              ) : (
                <button
                  onClick={() => setIsSellerModalOpen(true)}
                  className="create-auction-btn"
                  title={
                    language === "en"
                      ? "Become an Artist to create auctions"
                      : "აუქციონის შესაქმნელად გახდი ხელოვანი"
                  }
                >
                  <Plus size={18} />
                  <span>
                    {language === "en" ? "Create Auction" : "აუქციონის შექმნა"}
                  </span>
                </button>
              )}
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={theme === "light" ? "Dark Mode" : "Light Mode"}
              >
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
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
              {t("auctions.tabScheduled") || "მალე"}
            </button>
            <button
              className={`auction-tab ${activeTab === "ENDED" ? "active" : ""}`}
              onClick={() => handleTabChange("ENDED")}
            >
              <span className="tab-icon">🏆</span>
              {t("auctions.tabEnded") || "დასრულებული"}
            </button>
          </div>
        </div>

        {/* Filters - Below hero image */}
        <div className="auctions-filters-wrapper">
          <div className="auctions-filters-section">
            <AuctionFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="auctions-content">
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

      {/* Become Seller Modal */}
      <BecomeSellerModal
        isOpen={isSellerModalOpen}
        onClose={() => setIsSellerModalOpen(false)}
        customMessage={
          language === "en"
            ? "You need to be registered as an artist to create auctions"
            : "აუქციონის შესაქმნელად საჭიროა იყოთ ხელოვანად დარეგისტრირებული"
        }
      />
    </>
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
