"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/hooks/use-analytics-store";
import "./analytics-dashboard.css";

export default function AnalyticsDashboard() {
  const { data, isLoading, error, fetchAnalytics } = useAnalytics();

  useEffect(() => {
    fetchAnalytics();

    // Refresh data every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (error) {
    return (
      <div className="analytics-error">
        <p>❌ Analytics Error: {error}</p>
        <button onClick={fetchAnalytics}>🔄 Retry</button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <h2>📊 SoulArt - Vercel Analytics Dashboard</h2>

      <div className="analytics-grid">
        {/* Main Metrics */}
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-value">
            {isLoading ? "..." : data.visitors.toLocaleString()}
          </div>
          <div className="metric-label">ვიზიტორები</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📄</div>
          <div className="metric-value">
            {isLoading ? "..." : data.pageViews.toLocaleString()}
          </div>
          <div className="metric-label">გვერდის ნახვები</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-value">
            {isLoading ? "..." : data.sessions.toLocaleString()}
          </div>
          <div className="metric-label">სესიები</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-value">
            {isLoading ? "..." : `${data.bounceRate}%`}
          </div>
          <div className="metric-label">Bounce Rate</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⌚</div>
          <div className="metric-value">
            {isLoading
              ? "..."
              : `${Math.floor(data.avgSessionDuration / 60)}:${(
                  data.avgSessionDuration % 60
                )
                  .toString()
                  .padStart(2, "0")}`}
          </div>
          <div className="metric-label">საშ. სესიის ხანგრძლივობა</div>
        </div>
      </div>

      <div className="analytics-charts">
        {/* Top Pages */}
        <div className="chart-section">
          <h3>🔥 Top Pages</h3>
          <div className="page-list">
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              data.topPages.map((page, index) => (
                <div key={page.page} className="page-item">
                  <span className="page-rank">#{index + 1}</span>
                  <span className="page-path">{page.page}</span>
                  <span className="page-views">
                    {page.views.toLocaleString()} views
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Sources */}
        <div className="chart-section">
          <h3>🌐 Traffic Sources</h3>
          <div className="source-list">
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              data.topSources.map((source, index) => (
                <div key={source.source} className="source-item">
                  <span className="source-rank">#{index + 1}</span>
                  <span className="source-name">{source.source}</span>
                  <span className="source-visitors">
                    {source.visitors.toLocaleString()} visitors
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="analytics-footer">
        <p>🔄 ბოლო განახლება: {new Date().toLocaleTimeString("ka-GE")}</p>
        <p>📊 Powered by Vercel Analytics</p>
      </div>
    </div>
  );
}
