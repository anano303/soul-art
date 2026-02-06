"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { toast } from "react-hot-toast";
import { Settings, Save, Percent } from "lucide-react";
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

interface CommissionSettings {
  platformCommissionPercent: number;
  auctionAdminCommissionPercent: number;
  auctionAdminUserId?: string;
}

interface User {
  _id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  role: string;
}

export default function AdminAuctions() {
  const { t } = useLanguage();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "ALL" | "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED" | "SCHEDULED"
  >("ALL");

  // Commission settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [auctionAdmins, setAuctionAdmins] = useState<User[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    platformCommissionPercent: 10,
    auctionAdminCommissionPercent: 30,
    auctionAdminUserId: "",
  });

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

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await apiClient.get("/auctions/admin/settings");
      setSettings(response.data);
      setSettingsForm({
        platformCommissionPercent: response.data.platformCommissionPercent || 10,
        auctionAdminCommissionPercent: response.data.auctionAdminCommissionPercent || 30,
        auctionAdminUserId: response.data.auctionAdminUserId || "",
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchAuctionAdmins = async () => {
    try {
      // Fetch users with auction_admin role
      const response = await apiClient.get("/users?role=AUCTION_ADMIN&limit=100");
      setAuctionAdmins(response.data.items || []);
    } catch (error) {
      console.error("Failed to fetch auction admins:", error);
    }
  };

  const saveSettings = async () => {
    try {
      setSettingsLoading(true);
      await apiClient.patch("/auctions/admin/settings", settingsForm);
      toast.success("კომისიის პარამეტრები შენახულია");
      setShowSettings(false);
      fetchSettings();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("პარამეტრების შენახვა ვერ მოხერხდა");
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [filter]);

  useEffect(() => {
    fetchSettings();
    fetchAuctionAdmins();
  }, []);

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
        <div className="header-actions">
          <button
            className="admin-auctions-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={18} />
            საკომისიო
          </button>
          <Link
            href="/admin/auctions/create"
            className="admin-auctions-create-btn"
          >
            {t("admin.auctionsCreate.button")}
          </Link>
        </div>
      </div>

      {/* Commission Settings Panel */}
      {showSettings && (
        <div className="commission-settings-panel">
          <h3>
            <Percent size={20} />
            აუქციონის კომისიის პარამეტრები
          </h3>
          <div className="settings-grid">
            <div className="settings-field">
              <label>აუქციონ ადმინის წილი (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={settingsForm.auctionAdminCommissionPercent}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    auctionAdminCommissionPercent: Number(e.target.value),
                  })
                }
              />
              <span className="field-hint">
                გაყიდვის ფასიდან ამ პროცენტს მიიღებს აუქციონ ადმინი
              </span>
            </div>

            <div className="settings-field">
              <label>პლატფორმის წილი (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={settingsForm.platformCommissionPercent}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    platformCommissionPercent: Number(e.target.value),
                  })
                }
              />
              <span className="field-hint">
                გაყიდვის ფასიდან ამ პროცენტს მიიღებს საიტი
              </span>
            </div>

            <div className="settings-field calculated">
              <label>მხატვრის (სელერის) წილი</label>
              <div className="calculated-value">
                {100 - settingsForm.auctionAdminCommissionPercent - settingsForm.platformCommissionPercent}%
              </div>
              <span className="field-hint">
                დანარჩენს მიიღებს მხატვარი
              </span>
            </div>

            <div className="settings-field">
              <label>აუქციონ ადმინი</label>
              <select
                value={settingsForm.auctionAdminUserId}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    auctionAdminUserId: e.target.value,
                  })
                }
              >
                <option value="">-- აირჩიეთ --</option>
                {auctionAdmins.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name || user.ownerFirstName || user.firstName || ""}{" "}
                    {user.ownerLastName || user.lastName || ""} ({user.email})
                  </option>
                ))}
              </select>
              <span className="field-hint">
                მომხმარებელს უნდა ჰქონდეს auction_admin როლი
              </span>
            </div>
          </div>

          <div className="settings-info">
            <p>
              <strong>მაგალითი:</strong> თუ აუქციონ ადმინის წილი არის{" "}
              {settingsForm.auctionAdminCommissionPercent}% და პლატფორმის წილი
              არის {settingsForm.platformCommissionPercent}%, მაშინ 1000₾
              გაყიდვის შემთხვევაში:
            </p>
            <ul>
              <li>
                აუქციონ ადმინის შემოსავალი:{" "}
                {(1000 * settingsForm.auctionAdminCommissionPercent) / 100}₾
              </li>
              <li>
                პლატფორმის შემოსავალი:{" "}
                {(1000 * settingsForm.platformCommissionPercent) / 100}₾
              </li>
              <li>
                მხატვრის (სელერის) შემოსავალი:{" "}
                {1000 - (1000 * settingsForm.auctionAdminCommissionPercent) / 100 - (1000 * settingsForm.platformCommissionPercent) / 100}₾
                ({100 - settingsForm.auctionAdminCommissionPercent - settingsForm.platformCommissionPercent}%)
              </li>
            </ul>
          </div>

          <button
            className="save-settings-btn"
            onClick={saveSettings}
            disabled={settingsLoading}
          >
            <Save size={18} />
            {settingsLoading ? "იტვირთება..." : "შენახვა"}
          </button>
        </div>
      )}

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
