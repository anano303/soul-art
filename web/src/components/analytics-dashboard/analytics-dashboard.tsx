"use client";

import { useEffect, useState } from "react";
import { useAnalytics } from "@/hooks/use-analytics-store";
import "./analytics-dashboard.css";

export default function AnalyticsDashboard() {
  const {
    data,
    detailedErrors,
    isLoading,
    isLoadingErrors,
    error,
    fetchAnalytics,
    fetchDetailedErrors,
  } = useAnalytics();
  const [expandedErrorType, setExpandedErrorType] = useState<string | null>(
    null
  );
  const [selectedDays, setSelectedDays] = useState<number>(7);

  useEffect(() => {
    fetchAnalytics(selectedDays);

    // Refresh data every 5 minutes
    const interval = setInterval(
      () => fetchAnalytics(selectedDays),
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [fetchAnalytics, selectedDays]);

  const handleErrorTypeClick = (errorType: string) => {
    if (expandedErrorType === errorType) {
      setExpandedErrorType(null);
    } else {
      setExpandedErrorType(errorType);
      fetchDetailedErrors(errorType, selectedDays);
    }
  };

  const handleDaysChange = (days: number) => {
    setSelectedDays(days);
    setExpandedErrorType(null); // Reset expanded errors when changing period
  };

  if (error) {
    return (
      <div className="analytics-error">
        <p>❌ Analytics Error: {error}</p>
        <button onClick={() => fetchAnalytics(selectedDays)}>🔄 Retry</button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <h2>📊 SoulArt - Vercel Analytics Dashboard</h2>

      {/* Period Tabs */}
      <div className="period-tabs">
        <button
          className={`period-tab ${selectedDays === 1 ? "active" : ""}`}
          onClick={() => handleDaysChange(1)}
        >
          ბოლო 24 საათი
        </button>
        <button
          className={`period-tab ${selectedDays === 7 ? "active" : ""}`}
          onClick={() => handleDaysChange(7)}
        >
          ბოლო 7 დღე
        </button>
        <button
          className={`period-tab ${selectedDays === 30 ? "active" : ""}`}
          onClick={() => handleDaysChange(30)}
        >
          ბოლო 30 დღე
        </button>
      </div>

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

      {/* Errors Section */}
      {data.errors && data.errors.total > 0 && (
        <div className="errors-section">
          <h3>⚠️ Errors ({data.errors.total.toLocaleString()} total)</h3>
          <div className="errors-list">
            {data.errors.byType.map((errorItem) => (
              <div key={errorItem.type} className="error-item">
                <div
                  className="error-header"
                  onClick={() => handleErrorTypeClick(errorItem.type)}
                  style={{ cursor: "pointer" }}
                >
                  <span className="error-type">{errorItem.type}</span>
                  <span className="error-count">
                    {errorItem.count.toLocaleString()} errors
                  </span>
                  <span className="expand-icon">
                    {expandedErrorType === errorItem.type ? "▼" : "▶"}
                  </span>
                </div>

                {expandedErrorType === errorItem.type && (
                  <div className="error-details">
                    {isLoadingErrors ? (
                      <div className="loading-details">Loading details...</div>
                    ) : detailedErrors ? (
                      <div className="detailed-errors">
                        <div className="error-stats">
                          <div className="stat-box">
                            <div className="stat-label">Total Errors</div>
                            <div className="stat-value">
                              {detailedErrors.total}
                            </div>
                          </div>
                          <div className="stat-box">
                            <div className="stat-label">Period</div>
                            <div className="stat-value">
                              {detailedErrors.period}
                            </div>
                          </div>
                        </div>

                        {/* Top Failing Endpoints */}
                        {detailedErrors.topFailingEndpoints.length > 0 && (
                          <div className="error-subsection">
                            <h4>🔴 Top Failing Endpoints</h4>
                            <div className="endpoint-list">
                              {detailedErrors.topFailingEndpoints.map(
                                (ep, idx) => (
                                  <div key={idx} className="endpoint-item">
                                    <span className="endpoint-path">
                                      {ep.endpoint}
                                    </span>
                                    <span className="endpoint-count">
                                      {ep.count} errors
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Status Code Distribution */}
                        {detailedErrors.statusDistribution.length > 0 && (
                          <div className="error-subsection">
                            <h4>📊 Status Code Distribution</h4>
                            <div className="status-list">
                              {detailedErrors.statusDistribution.map(
                                (status, idx) => (
                                  <div key={idx} className="status-item">
                                    <span
                                      className={`status-code ${status.category}`}
                                    >
                                      {status.status}
                                    </span>
                                    <span className="status-category">
                                      {status.category}
                                    </span>
                                    <span className="status-count">
                                      {status.count} errors
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Error Details */}
                        {detailedErrors.summary.map((summary, idx) => (
                          <div key={idx} className="error-subsection">
                            <h4>
                              📝 {summary.type}
                              <span className="subsection-count">
                                ({summary.count} errors, {summary.uniqueErrors}{" "}
                                unique)
                              </span>
                            </h4>
                            <div className="error-details-table">
                              {summary.details.map((detail, didx) => (
                                <div key={didx} className="error-detail-row">
                                  <div className="error-detail-message">
                                    <strong>Message:</strong> {detail.message}
                                  </div>
                                  <div className="error-detail-info">
                                    {detail.endpoint &&
                                      detail.endpoint !== "(not set)" && (
                                        <span>
                                          <strong>Endpoint:</strong>{" "}
                                          {detail.endpoint}
                                        </span>
                                      )}
                                    {detail.status &&
                                      detail.status !== "(not set)" && (
                                        <span>
                                          <strong>Status:</strong>{" "}
                                          {detail.status}
                                        </span>
                                      )}
                                    {detail.page &&
                                      detail.page !== "(not set)" && (
                                        <span>
                                          <strong>Page:</strong> {detail.page}
                                        </span>
                                      )}
                                    <span>
                                      <strong>Count:</strong> {detail.count}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="analytics-footer">
        <p>🔄 ბოლო განახლება: {new Date().toLocaleTimeString("ka-GE")}</p>
        <p>📊 Powered by GA4 Analytics</p>
      </div>
    </div>
  );
}
