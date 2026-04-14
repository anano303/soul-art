"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/axios";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Rocket,
  ExternalLink,
  RefreshCw,
  Eye,
  ShoppingCart,
  Package,
} from "lucide-react";
import Image from "next/image";
import "./promotions-list.css";

interface Promotion {
  _id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  platforms: string[];
  duration: number;
  totalPrice: number;
  note?: string;
  sellerName: string;
  sellerEmail: string;
  status: "paid" | "confirmed" | "expired";
  confirmedAt?: string;
  expiresAt?: string;
  createdAt: string;
  statsViews?: number;
  statsAddToCart?: number;
  statsOrders?: number;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google Ads",
  tiktok: "TikTok",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  paid: { label: "გადახდილი — ელოდება დადასტურებას", color: "#f59e0b", icon: Clock },
  confirmed: { label: "დადასტურებული — რეკლამა გაშვებულია", color: "#28a745", icon: CheckCircle },
  expired: { label: "ვადა ამოწურულია", color: "#dc3545", icon: XCircle },
};

interface PromotionsListProps {
  mode?: "admin" | "seller";
}

export function PromotionsList({ mode = "admin" }: PromotionsListProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const isAdmin = mode === "admin";
  const endpoint = isAdmin ? "/promotions" : "/promotions/my";

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "50" };
      if (filter !== "all") params.status = filter;
      const res = await apiClient.get(endpoint, { params });
      setPromotions(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "მონაცემების ჩატვირთვა ვერ მოხერხდა",
      });
    } finally {
      setLoading(false);
    }
  }, [filter, endpoint]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleConfirm = async (id: string) => {
    setConfirming(id);
    try {
      await apiClient.post(`/promotions/${id}/confirm`);
      toast({
        title: "დადასტურებულია!",
        description: "რეკლამა წარმატებით დადასტურდა, სელერს ნოთიფიქეიშენი გაეგზავნა",
      });
      fetchPromotions();
    } catch {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "დადასტურება ვერ მოხერხდა",
      });
    } finally {
      setConfirming(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ka-GE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "ვადა ამოიწურა";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}დ ${hours % 24}სთ დარჩენილი`;
    return `${hours}სთ დარჩენილი`;
  };

  return (
    <div className="promos-admin">
      <div className="promos-admin__header">
        <div className="promos-admin__title-row">
          <Rocket size={28} />
          <h1>{isAdmin ? "რეკლამების მართვა" : "ჩემი რეკლამები"}</h1>
          <span className="promos-admin__count">{total}</span>
        </div>
        <button
          className="promos-admin__refresh"
          onClick={fetchPromotions}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          განახლება
        </button>
      </div>

      <div className="promos-admin__filters">
        {[
          { key: "all", label: "ყველა" },
          { key: "paid", label: "მოლოდინში" },
          { key: "confirmed", label: "აქტიური" },
          { key: "expired", label: "ვადაგასული" },
        ].map((f) => (
          <button
            key={f.key}
            className={`promos-admin__filter-btn ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="promos-admin__loading">
          <Loader2 size={32} className="spin" />
          <span>იტვირთება...</span>
        </div>
      ) : promotions.length === 0 ? (
        <div className="promos-admin__empty">
          {isAdmin ? "რეკლამების მოთხოვნა არ არის" : "ჯერ რეკლამა არ გაგიშვიათ"}
        </div>
      ) : (
        <div className="promos-admin__list">
          {promotions.map((promo) => {
            const statusCfg = STATUS_CONFIG[promo.status] || STATUS_CONFIG.paid;
            const StatusIcon = statusCfg.icon;
            const timeRemaining =
              promo.status === "confirmed"
                ? getTimeRemaining(promo.expiresAt)
                : null;
            const showStats = promo.status === "confirmed" || promo.status === "expired";

            return (
              <div key={promo._id} className="promo-card">
                <div className="promo-card__left">
                  {promo.productImage ? (
                    <Image
                      src={promo.productImage}
                      alt={promo.productName}
                      width={80}
                      height={80}
                      className="promo-card__image"
                      unoptimized
                    />
                  ) : (
                    <div className="promo-card__image-placeholder">📦</div>
                  )}
                </div>

                <div className="promo-card__center">
                  <div className="promo-card__product-name">
                    {promo.productName}
                    <a
                      href={promo.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="promo-card__link"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className="promo-card__meta">
                    {isAdmin && (
                      <span>
                        👤 {promo.sellerName}{" "}
                        <small>({promo.sellerEmail})</small>
                      </span>
                    )}
                    <span>
                      📢{" "}
                      {promo.platforms
                        .map((p) => PLATFORM_LABELS[p] || p)
                        .join(", ")}
                    </span>
                    <span>⏱️ {promo.duration} დღე</span>
                    <span>
                      💰 {promo.totalPrice}₾
                    </span>
                    {promo.note && <span>📝 {promo.note}</span>}
                  </div>

                  <div className="promo-card__dates">
                    <span>შეკვეთა: {formatDate(promo.createdAt)}</span>
                    {promo.confirmedAt && (
                      <span>დადასტურდა: {formatDate(promo.confirmedAt)}</span>
                    )}
                    {promo.expiresAt && (
                      <span>ვადა: {formatDate(promo.expiresAt)}</span>
                    )}
                  </div>

                  {showStats && (
                    <div className="promo-card__stats">
                      <div className="promo-card__stat">
                        <Eye size={14} />
                        <span>{promo.statsViews ?? 0}</span>
                        <small>ნახვა</small>
                      </div>
                      <div className="promo-card__stat">
                        <ShoppingCart size={14} />
                        <span>{promo.statsAddToCart ?? 0}</span>
                        <small>კალათში</small>
                      </div>
                      <div className="promo-card__stat">
                        <Package size={14} />
                        <span>{promo.statsOrders ?? 0}</span>
                        <small>შეკვეთა</small>
                      </div>
                    </div>
                  )}
                </div>

                <div className="promo-card__right">
                  <div
                    className="promo-card__status"
                    style={{ color: statusCfg.color }}
                  >
                    <StatusIcon size={18} />
                    <span>{statusCfg.label}</span>
                  </div>

                  {timeRemaining && (
                    <div className="promo-card__remaining">
                      🕐 {timeRemaining}
                    </div>
                  )}

                  {isAdmin && promo.status === "paid" && (
                    <button
                      className="promo-card__confirm-btn"
                      onClick={() => handleConfirm(promo._id)}
                      disabled={confirming === promo._id}
                    >
                      {confirming === promo._id ? (
                        <>
                          <Loader2 size={16} className="spin" />
                          დასტურდება...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          დადასტურება
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
