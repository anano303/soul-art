"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  X,
  Users,
  Eye,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  MousePointer,
  UserPlus,
  Activity,
  Calendar,
  Globe,
  Clock,
} from "lucide-react";
import "./manager-analytics-modal.css";

interface FunnelStats {
  visits: number;
  uniqueVisitors: number;
  registrations: number;
  addToCarts: number;
  checkoutStarts: number;
  purchases: number;
  conversionRate: number;
  totalRevenue: number;
  commissionRate: number;
}

interface TrackingEvent {
  _id: string;
  eventType: string;
  visitorId?: string;
  user?: { name: string; email: string };
  email?: string;
  landingPage?: string;
  referrerUrl?: string;
  orderAmount?: number;
  createdAt: string;
}

interface DailyStats {
  date: string;
  visits: number;
  registrations: number;
  purchases: number;
  revenue: number;
  commission: number;
}

interface ManagerInfo {
  _id: string;
  name: string;
  email: string;
  salesRefCode: string;
}

interface Props {
  manager: ManagerInfo;
  onClose: () => void;
}

export function ManagerAnalyticsModal({ manager, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "tracking" | "daily">(
    "overview"
  );
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);
  const [tracking, setTracking] = useState<TrackingEvent[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingPage, setTrackingPage] = useState(1);
  const [trackingTotal, setTrackingTotal] = useState(0);
  const [eventFilter, setEventFilter] = useState<string>("");

  useEffect(() => {
    fetchFunnelStats();
  }, [manager._id]);

  useEffect(() => {
    if (activeTab === "tracking") {
      fetchTrackingEvents();
    } else if (activeTab === "daily") {
      fetchDailyStats();
    }
  }, [activeTab, trackingPage, eventFilter]);

  const fetchFunnelStats = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `/sales-commission/admin/manager/${manager._id}/funnel`
      );
      if (res.ok) {
        const data = await res.json();
        setFunnel(data);
      }
    } catch (error) {
      console.error("Error fetching funnel:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingEvents = async () => {
    try {
      const url = eventFilter
        ? `/sales-commission/admin/manager/${manager._id}/tracking?page=${trackingPage}&eventType=${eventFilter}`
        : `/sales-commission/admin/manager/${manager._id}/tracking?page=${trackingPage}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setTracking(data.events || []);
        setTrackingTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching tracking:", error);
    }
  };

  const fetchDailyStats = async () => {
    try {
      const res = await fetchWithAuth(
        `/sales-commission/admin/manager/${manager._id}/daily-stats?days=30`
      );
      if (res.ok) {
        const data = await res.json();
        setDailyStats(data);
      }
    } catch (error) {
      console.error("Error fetching daily stats:", error);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "VISIT":
        return <Eye size={14} />;
      case "REGISTRATION":
        return <UserPlus size={14} />;
      case "ADD_TO_CART":
        return <ShoppingCart size={14} />;
      case "CHECKOUT_START":
        return <CreditCard size={14} />;
      case "PURCHASE":
        return <TrendingUp size={14} />;
      default:
        return <Activity size={14} />;
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      VISIT: "ვიზიტი",
      REGISTRATION: "რეგისტრაცია",
      ADD_TO_CART: "კალათაში დამატება",
      CHECKOUT_START: "Checkout დაწყება",
      PURCHASE: "შეძენა",
    };
    return labels[eventType] || eventType;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("ka-GE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="analytics-modal-overlay" onClick={onClose}>
      <div
        className="analytics-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="analytics-modal-header">
          <div className="analytics-modal-title">
            <Users size={24} />
            <div>
              <h2>{manager.name}</h2>
              <p>{manager.email}</p>
              <code className="ref-code-badge">{manager.salesRefCode}</code>
            </div>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="analytics-tabs">
          <button
            className={`analytics-tab ${
              activeTab === "overview" ? "active" : ""
            }`}
            onClick={() => setActiveTab("overview")}
          >
            <TrendingUp size={16} />
            მთავარი
          </button>
          <button
            className={`analytics-tab ${
              activeTab === "tracking" ? "active" : ""
            }`}
            onClick={() => setActiveTab("tracking")}
          >
            <Activity size={16} />
            აქტივობა
          </button>
          <button
            className={`analytics-tab ${activeTab === "daily" ? "active" : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            <Calendar size={16} />
            დღიური
          </button>
        </div>

        <div className="analytics-modal-body">
          {loading && activeTab === "overview" ? (
            <div className="analytics-loading">იტვირთება...</div>
          ) : (
            <>
              {activeTab === "overview" && funnel && (
                <div className="funnel-overview">
                  <div className="funnel-stats-grid">
                    <div className="funnel-stat-card visits">
                      <Eye size={28} />
                      <div className="funnel-stat-info">
                        <span className="funnel-stat-value">
                          {funnel.visits}
                        </span>
                        <span className="funnel-stat-label">ვიზიტები</span>
                      </div>
                    </div>
                    <div className="funnel-stat-card unique">
                      <Users size={28} />
                      <div className="funnel-stat-info">
                        <span className="funnel-stat-value">
                          {funnel.uniqueVisitors}
                        </span>
                        <span className="funnel-stat-label">უნიკალური</span>
                      </div>
                    </div>
                    <div className="funnel-stat-card registrations">
                      <UserPlus size={28} />
                      <div className="funnel-stat-info">
                        <span className="funnel-stat-value">
                          {funnel.registrations}
                        </span>
                        <span className="funnel-stat-label">რეგისტრაციები</span>
                      </div>
                    </div>
                    <div className="funnel-stat-card carts">
                      <ShoppingCart size={28} />
                      <div className="funnel-stat-info">
                        <span className="funnel-stat-value">
                          {funnel.addToCarts}
                        </span>
                        <span className="funnel-stat-label">კალათაში</span>
                      </div>
                    </div>
                    <div className="funnel-stat-card checkout">
                      <CreditCard size={28} />
                      <div className="funnel-stat-info">
                        <span className="funnel-stat-value">
                          {funnel.checkoutStarts}
                        </span>
                        <span className="funnel-stat-label">Checkout</span>
                      </div>
                    </div>
                    <div className="funnel-stat-card purchases">
                      <TrendingUp size={28} />
                      <div className="funnel-stat-info">
                        <span className="funnel-stat-value">
                          {funnel.purchases}
                        </span>
                        <span className="funnel-stat-label">შეძენები</span>
                      </div>
                    </div>
                  </div>

                  <div className="funnel-summary">
                    <div className="summary-item conversion">
                      <span className="summary-label">კონვერსია</span>
                      <span className="summary-value">
                        {funnel.conversionRate}%
                      </span>
                    </div>
                    <div className="summary-item revenue">
                      <span className="summary-label">შემოსავალი</span>
                      <span className="summary-value">
                        ₾{funnel.totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="summary-item rate">
                      <span className="summary-label">საკომისიო %</span>
                      <span className="summary-value">
                        {funnel.commissionRate}%
                      </span>
                    </div>
                  </div>

                  {funnel.visits === 0 && (
                    <div className="no-activity-message">
                      <MousePointer size={48} />
                      <h3>აქტივობა არ არის</h3>
                      <p>
                        ეს მენეჯერი ჯერ არ დაწყებულა მუშაობა ან არ გაუზიარებია
                        ლინკი.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "tracking" && (
                <div className="tracking-section">
                  <div className="tracking-filters">
                    <select
                      value={eventFilter}
                      onChange={(e) => {
                        setEventFilter(e.target.value);
                        setTrackingPage(1);
                      }}
                      className="event-filter-select"
                    >
                      <option value="">ყველა ივენტი</option>
                      <option value="VISIT">ვიზიტები</option>
                      <option value="REGISTRATION">რეგისტრაციები</option>
                      <option value="ADD_TO_CART">კალათაში დამატება</option>
                      <option value="CHECKOUT_START">Checkout</option>
                      <option value="PURCHASE">შეძენები</option>
                    </select>
                    <span className="tracking-count">
                      სულ: {trackingTotal} ჩანაწერი
                    </span>
                  </div>

                  {tracking.length === 0 ? (
                    <div className="no-activity-message">
                      <Activity size={48} />
                      <h3>ჩანაწერები არ არის</h3>
                    </div>
                  ) : (
                    <div className="tracking-list">
                      {tracking.map((event) => (
                        <div key={event._id} className="tracking-item">
                          <div
                            className={`tracking-icon ${event.eventType.toLowerCase()}`}
                          >
                            {getEventIcon(event.eventType)}
                          </div>
                          <div className="tracking-info">
                            <div className="tracking-main">
                              <span className="tracking-type">
                                {getEventLabel(event.eventType)}
                              </span>
                              {event.user && (
                                <span className="tracking-user">
                                  {event.user.name || event.user.email}
                                </span>
                              )}
                              {event.email && !event.user && (
                                <span className="tracking-user">
                                  {event.email}
                                </span>
                              )}
                              {event.orderAmount && (
                                <span className="tracking-amount">
                                  ₾{event.orderAmount.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="tracking-meta">
                              <span className="tracking-time">
                                <Clock size={12} />
                                {formatDate(event.createdAt)}
                              </span>
                              {event.landingPage && (
                                <span className="tracking-page">
                                  <Globe size={12} />
                                  {event.landingPage}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {trackingTotal > 50 && (
                    <div className="tracking-pagination">
                      <button
                        disabled={trackingPage === 1}
                        onClick={() => setTrackingPage((p) => p - 1)}
                      >
                        წინა
                      </button>
                      <span>გვერდი {trackingPage}</span>
                      <button
                        disabled={tracking.length < 50}
                        onClick={() => setTrackingPage((p) => p + 1)}
                      >
                        შემდეგი
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "daily" && (
                <div className="daily-stats-section">
                  {dailyStats.length === 0 ? (
                    <div className="no-activity-message">
                      <Calendar size={48} />
                      <h3>დღიური სტატისტიკა არ არის</h3>
                    </div>
                  ) : (
                    <div className="daily-stats-table-container">
                      <table className="daily-stats-table">
                        <thead>
                          <tr>
                            <th>თარიღი</th>
                            <th>ვიზიტები</th>
                            <th>რეგისტრაციები</th>
                            <th>შეძენები</th>
                            <th>შემოსავალი</th>
                            <th>საკომისიო</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyStats.map((day) => (
                            <tr key={day.date}>
                              <td>{day.date}</td>
                              <td>{day.visits}</td>
                              <td>{day.registrations}</td>
                              <td>{day.purchases}</td>
                              <td>₾{day.revenue.toFixed(2)}</td>
                              <td className="commission-cell">
                                ₾{day.commission.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
