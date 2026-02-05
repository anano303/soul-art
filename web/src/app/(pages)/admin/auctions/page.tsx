"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { toast } from "react-hot-toast";
import "./admin-auctions.css";

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
  endDate: string;
  status: "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED" | "SCHEDULED";
  totalBids: number;
  seller: {
    ownerFirstName?: string;
    ownerLastName?: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  createdAt: string;
}

export default function AdminAuctions() {
  const { t } = useLanguage();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "ALL" | "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED" | "SCHEDULED"
  >("ALL");

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        status: filter, // Always send status, including "ALL"
      });

      const response = await apiClient.get(`/auctions?${params.toString()}`);
      setAuctions(response.data.auctions || []);
    } catch (error) {
      console.error("Failed to fetch auctions:", error);
      toast.error(t("admin.auctionsLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [filter]);

  const approveAuction = async (auctionId: string) => {
    try {
      await apiClient.patch(`/auctions/${auctionId}/approve`);
      toast.success(t("admin.auctionApproved"));
      fetchAuctions();
    } catch (error) {
      console.error("Failed to approve auction:", error);
      toast.error(t("admin.auctionApproveError"));
    }
  };

  const deleteAuction = async (auctionId: string) => {
    if (!confirm(t("admin.confirmDeleteAuction"))) return;

    try {
      await apiClient.delete(`/auctions/${auctionId}`);
      toast.success(t("admin.auctionDeleted"));
      fetchAuctions();
    } catch (error) {
      console.error("Failed to delete auction:", error);
      toast.error(t("admin.auctionDeleteError"));
    }
  };

  const getSellerName = (seller: Auction["seller"]) => {
    if (seller.ownerFirstName && seller.ownerLastName) {
      return `${seller.ownerFirstName} ${seller.ownerLastName}`;
    }
    if (seller.firstName && seller.lastName) {
      return `${seller.firstName} ${seller.lastName}`;
    }
    return seller.email;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "status-active";
      case "ENDED":
        return "status-ended";
      case "PENDING":
        return "status-pending";
      case "CANCELLED":
        return "status-cancelled";
      default:
        return "";
    }
  };

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

  return (
    <div className="admin-auctions-container">
      <div className="admin-auctions-header">
        <div>
          <h1 className="admin-auctions-title">
            {t("admin.auctionsManagement")}
          </h1>
          <p className="admin-auctions-subtitle">
            {t("admin.auctionsSubtitle")}
          </p>
        </div>
        <Link
          href="/admin/auctions/create"
          className="admin-auctions-create-btn"
        >
          {t("admin.auctionsCreate.button")}
        </Link>
      </div>

      <div className="admin-auctions-filters">
        <div className="filter-buttons">
          {["ALL", "PENDING", "SCHEDULED", "ACTIVE", "ENDED", "CANCELLED"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`filter-btn ${filter === status ? "active" : ""}`}
              >
                {t(`admin.statusFilter.${status.toLowerCase()}`)}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="admin-auctions-stats">
        <div className="stat-card">
          <div className="stat-number">{auctions.length}</div>
          <div className="stat-label">{t("admin.totalAuctions")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {auctions.filter((a) => a.status === "ACTIVE").length}
          </div>
          <div className="stat-label">{t("admin.activeAuctions")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {auctions.filter((a) => a.status === "PENDING").length}
          </div>
          <div className="stat-label">{t("admin.pendingAuctions")}</div>
        </div>
      </div>

      <div className="admin-auctions-table">
        {auctions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <h3>{t("admin.noAuctions")}</h3>
            <p>{t("admin.noAuctionsDesc")}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="auctions-table">
              <thead>
                <tr>
                  <th>{t("admin.image")}</th>
                  <th>{t("admin.title")}</th>
                  <th>{t("admin.seller")}</th>
                  <th>{t("admin.price")}</th>
                  <th>{t("admin.bids")}</th>
                  <th>{t("admin.status")}</th>
                  <th>{t("admin.created")}</th>
                  <th>{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {auctions.map((auction) => (
                  <tr key={auction._id}>
                    <td>
                      <img
                        src={auction.mainImage}
                        alt={auction.title}
                        className="auction-thumbnail"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/placeholder-artwork.jpg";
                        }}
                      />
                    </td>
                    <td>
                      <div className="auction-info">
                        <div className="auction-title">{auction.title}</div>
                        <div className="auction-type">
                          {t(
                            `auctions.type.${auction.artworkType.toLowerCase()}`,
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="seller-info">
                        <div className="seller-name">
                          {getSellerName(auction.seller)}
                        </div>
                        <div className="seller-email">
                          {auction.seller.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="price-info">
                        <div className="current-price">
                          {auction.currentPrice} ₾
                        </div>
                        <div className="starting-price">
                          {t("admin.starting")}: {auction.startingPrice} ₾
                        </div>
                      </div>
                    </td>
                    <td className="bid-count">{auction.totalBids}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusColor(
                          auction.status,
                        )}`}
                      >
                        {t(`auctions.status.${auction.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="created-date">
                      {new Date(auction.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link
                          href={`/admin/auctions/${auction._id}/edit`}
                          className="action-btn edit-btn"
                          title={t("admin.edit")}
                        >
                          ✏️
                        </Link>
                        {auction.status === "PENDING" && (
                          <button
                            onClick={() => approveAuction(auction._id)}
                            className="action-btn approve-btn"
                            title={t("admin.approve")}
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => deleteAuction(auction._id)}
                          className="action-btn delete-btn"
                          title={t("admin.delete")}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
