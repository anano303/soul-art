"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/axios";
import { Role } from "@/types/role";
import { TrendingUp, ArrowLeft, RefreshCw, Calendar } from "lucide-react";
import "./sales-analytics.css";

interface FunnelStats {
  visits: number;
  registrations: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
  totalRevenue: number;
  totalCommission: number;
  commissionRate: number;
  conversionRates: {
    visitToRegistration: number;
    registrationToCart: number;
    cartToCheckout: number;
    checkoutToPurchase: number;
    overall: number;
  };
}

interface DailyStats {
  date: string;
  visits: number;
  registrations: number;
  purchases: number;
  revenue: number;
  commission: number;
}

export default function SalesAnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [funnelStats, setFunnelStats] = useState<FunnelStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("7d");

  // Helper to check if user has sales manager role
  const hasSalesManagerRole = (role?: string) => {
    if (!role) return false;
    return role === Role.SalesManager || role === "seller_sales_manager";
  };

  useEffect(() => {
    if (!authLoading && (!user || !hasSalesManagerRole(user.role))) {
      router.push("/admin");
    }
  }, [user, authLoading, router]);

  const fetchAnalytics = async () => {
    if (!user || !hasSalesManagerRole(user.role)) return;

    setIsLoading(true);
    try {
      // გამოვთვალოთ თარიღის range
      let startDate: string | undefined;
      if (dateRange === "7d") {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        startDate = date.toISOString();
      } else if (dateRange === "30d") {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        startDate = date.toISOString();
      }

      const [funnelRes, dailyRes] = await Promise.all([
        apiClient.get(
          `/sales-commission/my-funnel${
            startDate ? `?startDate=${startDate}` : ""
          }`
        ),
        apiClient.get(
          `/sales-commission/my-daily-stats?days=${
            dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 365
          }`
        ),
      ]);

      // Transform funnel response to match our interface
      const funnelData = funnelRes.data;
      const commissionRate = funnelData.commissionRate || 3;
      setFunnelStats({
        visits: funnelData.visits || 0,
        registrations: funnelData.registrations || 0,
        addToCarts: funnelData.addToCarts || 0,
        checkouts: funnelData.checkoutStarts || 0,
        purchases: funnelData.purchases || 0,
        totalRevenue: funnelData.totalRevenue || 0,
        totalCommission:
          (funnelData.totalRevenue || 0) * (commissionRate / 100),
        commissionRate: commissionRate,
        conversionRates: {
          visitToRegistration:
            funnelData.visits > 0
              ? (funnelData.registrations / funnelData.visits) * 100
              : 0,
          registrationToCart:
            funnelData.registrations > 0
              ? (funnelData.addToCarts / funnelData.registrations) * 100
              : 0,
          cartToCheckout:
            funnelData.addToCarts > 0
              ? (funnelData.checkoutStarts / funnelData.addToCarts) * 100
              : 0,
          checkoutToPurchase:
            funnelData.checkoutStarts > 0
              ? (funnelData.purchases / funnelData.checkoutStarts) * 100
              : 0,
          overall: funnelData.conversionRate || 0,
        },
      });

      setDailyStats(dailyRes.data || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateRange]);

  if (authLoading || !user || !hasSalesManagerRole(user.role)) {
    return (
      <div className="sales-analytics-loading">
        <RefreshCw className="animate-spin" size={40} />
        <p>იტვირთება...</p>
      </div>
    );
  }

  return (
    <div className="sales-analytics-container">
      {/* Header */}
      <div className="sales-analytics-header">
        <button onClick={() => router.back()} className="back-button">
          <ArrowLeft size={20} />
          უკან
        </button>
        <h1>
          <TrendingUp size={28} />
          ანალიტიკა
        </h1>
        <button onClick={fetchAnalytics} className="refresh-button">
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          განახლება
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="date-range-filter">
        <Calendar size={18} />
        <button
          className={dateRange === "7d" ? "active" : ""}
          onClick={() => setDateRange("7d")}
        >
          7 დღე
        </button>
        <button
          className={dateRange === "30d" ? "active" : ""}
          onClick={() => setDateRange("30d")}
        >
          30 დღე
        </button>
        <button
          className={dateRange === "all" ? "active" : ""}
          onClick={() => setDateRange("all")}
        >
          ყველა
        </button>
      </div>

      {isLoading ? (
        <div className="sales-analytics-loading">
          <RefreshCw className="animate-spin" size={40} />
          <p>მონაცემები იტვირთება...</p>
        </div>
      ) : (
        <>
          {/* Visual Funnel */}
          <div className="visual-funnel-section">
            <h2>
              <TrendingUp size={22} />
              გაყიდვების Funnel
            </h2>
            <div className="visual-funnel">
              <div className="funnel-bar visits-bar">
                <span>ვიზიტები: {funnelStats?.visits || 0}</span>
              </div>
              <div className="funnel-bar registrations-bar">
                <span>რეგისტრაციები: {funnelStats?.registrations || 0}</span>
                <span className="funnel-rate-inline">
                  (
                  {funnelStats?.conversionRates?.visitToRegistration?.toFixed(
                    1
                  ) || 0}
                  %)
                </span>
              </div>
              <div className="funnel-bar cart-bar">
                <span>კალათა: {funnelStats?.addToCarts || 0}</span>
                <span className="funnel-rate-inline">
                  (
                  {funnelStats?.conversionRates?.registrationToCart?.toFixed(
                    1
                  ) || 0}
                  %)
                </span>
              </div>
              <div className="funnel-bar checkout-bar">
                <span>Checkout: {funnelStats?.checkouts || 0}</span>
                <span className="funnel-rate-inline">
                  (
                  {funnelStats?.conversionRates?.cartToCheckout?.toFixed(1) ||
                    0}
                  %)
                </span>
              </div>
              <div className="funnel-bar purchases-bar">
                <span>შეკვეთები: {funnelStats?.purchases || 0}</span>
                <span className="funnel-rate-inline overall">
                  (საერთო:{" "}
                  {funnelStats?.conversionRates?.overall?.toFixed(1) || 0}%)
                </span>
              </div>
            </div>

            {/* Revenue Summary */}
            <div className="revenue-summary">
              <div className="revenue-item">
                <span className="revenue-label">შემოსული თანხა:</span>
                <span className="revenue-value">
                  ₾{(funnelStats?.totalRevenue || 0).toFixed(2)}
                </span>
              </div>
              <div className="revenue-item commission">
                <span className="revenue-label">
                  გამომუშავებული ({funnelStats?.commissionRate ?? 3}%):
                </span>
                <span className="revenue-value">
                  ₾{(funnelStats?.totalCommission || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Stats Table */}
          {dailyStats.length > 0 && (
            <div className="daily-stats-section">
              <h2>
                <Calendar size={22} />
                დღიური სტატისტიკა
              </h2>
              <table className="daily-stats-table">
                <thead>
                  <tr>
                    <th>თარიღი</th>
                    <th>ვიზიტები</th>
                    <th>რეგისტრაციები</th>
                    <th>შეკვეთები</th>
                    <th>შემოსავალი</th>
                    <th>საკომისიო</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.map((day) => (
                    <tr key={day.date}>
                      <td data-label="თარიღი">
                        {new Date(day.date).toLocaleDateString("ka-GE")}
                      </td>
                      <td data-label="ვიზიტები">{day.visits}</td>
                      <td data-label="რეგისტრაციები">{day.registrations}</td>
                      <td data-label="შეკვეთები">{day.purchases}</td>
                      <td data-label="შემოსავალი">₾{day.revenue.toFixed(2)}</td>
                      <td data-label="საკომისიო" className="commission-cell">
                        ₾{(day.commission || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
