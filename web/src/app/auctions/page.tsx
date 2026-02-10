"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
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

  const fetchAuctions = useCallback(
    async (page: number = 1, status: string = activeTab) => {
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
    },
    [filters, activeTab],
  );

  useEffect(() => {
    fetchAuctions(1, activeTab);
  }, [fetchAuctions, activeTab]);

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

  // JSON-LD structured data for auctions list page
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ხელოვნების აუქციონები | SoulArt",
    description:
      "იყიდეთ უნიკალური ხელოვნების ნიმუშები SoulArt აუქციონზე! ორიგინალი ნახატები და თანამედროვე ქართველი მხატვრების ნამუშევრები.",
    url: "https://soulart.ge/auctions",
    isPartOf: {
      "@type": "WebSite",
      name: "SoulArt",
      url: "https://soulart.ge",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: pagination.total || auctions.length,
      itemListElement: auctions
        .slice(0, 10)
        .map((auction: Auction, index: number) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: auction.title,
            image: auction.mainImage,
            description: auction.description?.substring(0, 200),
            offers: {
              "@type": "Offer",
              priceCurrency: "GEL",
              price: auction.currentPrice || auction.startingPrice,
              availability:
                auction.status === "ACTIVE"
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            },
            url: `https://soulart.ge/auctions/${auction._id}`,
          },
        })),
    },
  };

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="auc-container">
        <div className="auc-header">
          <div className="auc-header-top-row">
            <h1 className="auc-title">
              <span className="auc-title-text">Soul Art</span>
              <span className="auc-title-auctions">
                <Gavel className="auc-gavel-icon" />
                Auctions
              </span>
            </h1>
            <div className="auc-header-actions">
              {canCreateAuction && createAuctionLink ? (
                <Link
                  href={createAuctionLink}
                  className="auc-create-btn"
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
                  className="auc-create-btn"
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
                className="auc-theme-toggle"
                onClick={toggleTheme}
                title={theme === "light" ? "Dark Mode" : "Light Mode"}
              >
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
          <p className="auc-subtitle">{t("auctions.subtitle")}</p>

          {/* Status Tabs */}
          <div className="auc-tabs">
            <button
              className={`auc-tab ${activeTab === "ACTIVE" ? "active" : ""}`}
              onClick={() => handleTabChange("ACTIVE")}
            >
              <span className="auc-tab-icon">🔥</span>
              {t("auctions.tabActive") || "აქტიური"}
            </button>
            <button
              className={`auc-tab ${activeTab === "SCHEDULED" ? "active" : ""}`}
              onClick={() => handleTabChange("SCHEDULED")}
            >
              <span className="auc-tab-icon">📅</span>
              {t("auctions.tabScheduled") || "მალე"}
            </button>
            <button
              className={`auc-tab ${activeTab === "ENDED" ? "active" : ""}`}
              onClick={() => handleTabChange("ENDED")}
            >
              <span className="auc-tab-icon">🏆</span>
              {t("auctions.tabEnded") || "დასრულებული"}
            </button>
          </div>
        </div>

        {/* Filters - Below hero image */}
        <div className="auc-filters-wrapper">
          <div className="auc-filters-section">
            <AuctionFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="auc-content">
          <main className="auc-main">
            {loading ? (
              <div className="auc-loading-state">
                <div className="auc-loading-spinner"></div>
                <p>{t("auctions.loading")}</p>
              </div>
            ) : auctions.length === 0 ? (
              <div className="auc-empty-state">
                <div className="auc-empty-icon">
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
                <div className="auc-grid">
                  {auctions.map((auction) => (
                    <AuctionCard key={auction._id} auction={auction} />
                  ))}
                </div>

                {pagination.pages > 1 && (
                  <div className="auc-pagination">
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
        <div className="auc-container">
          <div className="auc-loading-state">
            <div className="auc-loading-spinner"></div>
            <p>იტვირთება...</p>
          </div>
        </div>
      }
    >
      <AuctionsContent />
    </Suspense>
  );
}

function AuctionsLoading() {
  return (
    <div className="auctions-container">
      <div className="loading-state">
        <div className="loading-spinner"></div>
      </div>
    </div>
  );
}

export default function AuctionsPage() {
  return (
    <Suspense fallback={<AuctionsLoading />}>
      <AuctionsContent />
    </Suspense>
  );
}
