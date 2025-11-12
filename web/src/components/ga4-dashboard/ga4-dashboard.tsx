"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import "./ga4-dashboard.css";

interface AnalyticsData {
  pageViews: { page: string; views: number; title?: string }[];
  homepageEvents: { event: string; count: number; details?: string }[];
  userJourneys: { path: string; count: number; avgTime?: number }[];
  purchaseFunnel: {
    step: string;
    count: number;
    dropoff?: number;
    percentage?: number;
  }[];
  errors: { type: string; count: number; message?: string }[];
  apiMetrics: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
  };
}

interface DetailedErrorData {
  total: number;
  summary: Array<{
    type: string;
    count: number;
    uniqueErrors: number;
    details: Array<{
      message: string;
      endpoint: string;
      status: string;
      page: string;
      count: number;
    }>;
  }>;
  topFailingEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    category: string;
  }>;
  period: string;
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function GA4Dashboard() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"1d" | "7d" | "30d" | "90d">("7d");
  const [expandedErrorType, setExpandedErrorType] = useState<string | null>(
    null
  );
  const [detailedErrors, setDetailedErrors] =
    useState<DetailedErrorData | null>(null);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<AnalyticsData>({
    pageViews: [],
    homepageEvents: [],
    userJourneys: [],
    purchaseFunnel: [],
    errors: [],
    apiMetrics: {
      total: 0,
      successful: 0,
      failed: 0,
      avgDuration: 0,
    },
  });

  useEffect(() => {
    // Fetch real analytics data from backend
    setLoading(true);
    setError(null);
    setExpandedErrorType(null); // Reset expanded errors when changing period

    const fetchAnalytics = async () => {
      try {
        const days =
          timeRange === "1d"
            ? 1
            : timeRange === "7d"
            ? 7
            : timeRange === "30d"
            ? 30
            : 90;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/analytics/ga4?days=${days}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch analytics: ${response.status} ${errorText}`
          );
        }

        const analyticsData = await response.json();
        setData(analyticsData);
        setError(null);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch analytics data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  // Fetch detailed errors
  const fetchDetailedErrors = async (errorType: string, page: number = 1) => {
    try {
      setIsLoadingErrors(true);
      const days =
        timeRange === "1d"
          ? 1
          : timeRange === "7d"
          ? 7
          : timeRange === "30d"
          ? 30
          : 90;

      const url = new URL(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/ga4/errors`
      );
      url.searchParams.append("days", days.toString());
      url.searchParams.append("errorType", errorType);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", "30");

      const response = await fetch(url.toString(), {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch detailed errors");
      }

      const errorData = await response.json();
      setDetailedErrors(errorData);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching detailed errors:", error);
    } finally {
      setIsLoadingErrors(false);
    }
  };

  const handleErrorTypeClick = (errorType: string) => {
    if (expandedErrorType === errorType) {
      setExpandedErrorType(null);
      setDetailedErrors(null);
      setCurrentPage(1);
    } else {
      setExpandedErrorType(errorType);
      setCurrentPage(1);
      fetchDetailedErrors(errorType, 1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (expandedErrorType) {
      fetchDetailedErrors(expandedErrorType, newPage);
    }
  };

  const successRate =
    data.apiMetrics.total > 0
      ? ((data.apiMetrics.successful / data.apiMetrics.total) * 100).toFixed(2)
      : "0";

  const conversionRate =
    data.purchaseFunnel.length > 0
      ? (
          (data.purchaseFunnel[data.purchaseFunnel.length - 1].count /
            data.purchaseFunnel[0].count) *
          100
        ).toFixed(2)
      : "0";

  return (
    <div className="ga4-dashboard">
      <div className="ga4-dashboard__header">
        <div className="ga4-dashboard__title-section">
          <h1 className="ga4-dashboard__title">
            📊 {language === "en" ? "Analytics Dashboard" : "ანალიტიკის პანელი"}
          </h1>
          <p className="ga4-dashboard__subtitle">
            {language === "en"
              ? "Google Analytics 4 - Comprehensive Website Analytics"
              : "Google Analytics 4 - ვებსაიტის სრული ანალიტიკა"}
          </p>

          {error && (
            <div
              style={{
                background: "#fee",
                border: "1px solid #f44",
                borderRadius: "8px",
                padding: "12px 16px",
                marginTop: "12px",
                fontSize: "0.9rem",
                color: "#c00",
              }}
            >
              <strong>❌ Error:</strong> {error}
              <br />
              <small>
                {language === "en"
                  ? "Check server logs and ensure GA4_CREDENTIALS and GA4_PROPERTY_ID are properly configured."
                  : "შეამოწმეთ სერვერის ლოგები და დარწმუნდით, რომ GA4_CREDENTIALS და GA4_PROPERTY_ID სწორად არის კონფიგურირებული."}
              </small>
            </div>
          )}

          {!error && data.pageViews.length === 0 && !loading && (
            <div
              style={{
                background: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "8px",
                padding: "12px 16px",
                marginTop: "12px",
                fontSize: "0.9rem",
              }}
            >
              <strong>ℹ️ Note:</strong>{" "}
              {language === "en"
                ? "No data available yet. GA4 Data API typically takes 24-48 hours to process data. Events are being tracked - check GA4 Real-time reports or browser console for '[GA4] Event sent:' messages."
                : "მონაცემები ჯერ არ არის ხელმისაწვდომი. GA4 Data API-ს ჩვეულებრივ 24-48 საათი სჭირდება მონაცემების დამუშავებისთვის. ივენთები ტრექინგში არიან - შეამოწმეთ GA4 Real-time რეპორტები ან ბრაუზერის კონსოლი '[GA4] Event sent:' შეტყობინებებისთვის."}
            </div>
          )}
        </div>

        <div className="ga4-dashboard__time-range">
          <button
            className={timeRange === "1d" ? "active" : ""}
            onClick={() => setTimeRange("1d")}
          >
            {language === "en" ? "1 Day" : "1 დღე"}
          </button>
          <button
            className={timeRange === "7d" ? "active" : ""}
            onClick={() => setTimeRange("7d")}
          >
            {language === "en" ? "7 Days" : "7 დღე"}
          </button>
          <button
            className={timeRange === "30d" ? "active" : ""}
            onClick={() => setTimeRange("30d")}
          >
            {language === "en" ? "30 Days" : "30 დღე"}
          </button>
          <button
            className={timeRange === "90d" ? "active" : ""}
            onClick={() => setTimeRange("90d")}
          >
            {language === "en" ? "90 Days" : "90 დღე"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ga4-dashboard__loading">
          <div className="spinner"></div>
          <p>{language === "en" ? "Loading analytics..." : "იტვირთება..."}</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="ga4-dashboard__metrics">
            <div className="metric-card metric-card--primary">
              <div className="metric-card__icon">🎯</div>
              <div className="metric-card__value">{conversionRate}%</div>
              <div className="metric-card__label">
                {language === "en"
                  ? "Conversion Rate"
                  : "კონვერსიის მაჩვენებელი"}
              </div>
            </div>

            <div className="metric-card metric-card--success">
              <div className="metric-card__icon">✅</div>
              <div className="metric-card__value">{successRate}%</div>
              <div className="metric-card__label">
                {language === "en" ? "API Success Rate" : "API წარმატების %"}
              </div>
            </div>

            <div className="metric-card metric-card--info">
              <div className="metric-card__icon">📄</div>
              <div className="metric-card__value">
                {data.pageViews
                  .reduce((sum, p) => sum + p.views, 0)
                  .toLocaleString()}
              </div>
              <div className="metric-card__label">
                {language === "en" ? "Total Page Views" : "გვერდის ნახვები"}
              </div>
            </div>

            <div className="metric-card metric-card--warning">
              <div className="metric-card__icon">⚠️</div>
              <div className="metric-card__value">
                {data.errors.reduce((sum, e) => sum + e.count, 0)}
              </div>
              <div className="metric-card__label">
                {language === "en" ? "Total Errors" : "შეცდომების რაოდენობა"}
              </div>
            </div>
          </div>

          {/* Section 1: Page Views */}
          <section className="ga4-section">
            <h2 className="ga4-section__title">
              📄 {language === "en" ? "Page Views" : "გვერდების ნახვები"}
            </h2>
            <div className="ga4-table">
              <table>
                <thead>
                  <tr>
                    <th>{language === "en" ? "Page" : "გვერდი"}</th>
                    <th>{language === "en" ? "Views" : "ნახვები"}</th>
                    <th>{language === "en" ? "Share" : "წილი"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pageViews.map((page, index) => {
                    const totalViews = data.pageViews.reduce(
                      (sum, p) => sum + p.views,
                      0
                    );
                    const share = ((page.views / totalViews) * 100).toFixed(1);

                    return (
                      <tr key={index}>
                        <td>
                          <div className="table-cell-main">{page.page}</div>
                          {page.title && (
                            <div className="table-cell-sub">{page.title}</div>
                          )}
                        </td>
                        <td className="table-cell-number">
                          {page.views.toLocaleString()}
                        </td>
                        <td>
                          <div className="progress-bar">
                            <div
                              className="progress-bar__fill"
                              style={{ width: `${share}%` }}
                            ></div>
                            <span className="progress-bar__label">
                              {share}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: Homepage Events */}
          <section className="ga4-section">
            <h2 className="ga4-section__title">
              🏠{" "}
              {language === "en"
                ? "Homepage Interactions"
                : "მთავარი გვერდის ინტერაქციები"}
            </h2>
            <div className="ga4-grid">
              {data.homepageEvents.map((event, index) => (
                <div key={index} className="event-card">
                  <div className="event-card__count">{event.count}</div>
                  <div className="event-card__name">{event.event}</div>
                  {event.details && (
                    <div className="event-card__details">{event.details}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: User Journey Paths */}
          <section className="ga4-section">
            <h2 className="ga4-section__title">
              🗺️{" "}
              {language === "en"
                ? "User Journey Paths (Sequential)"
                : "მომხმარებლის მარშრუტები (თანმიმდევრული)"}
            </h2>
            <p
              className="ga4-section__description"
              style={{ marginBottom: "1rem", color: "#666" }}
            >
              {language === "en"
                ? "See the exact sequence of pages users visit. Each path shows the journey from entry to exit."
                : "ნახეთ გვერდების ზუსტი თანმიმდევრობა რომელსაც მომხმარებლები ეწვევიან."}
            </p>
            <div className="ga4-table">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "60%" }}>
                      {language === "en"
                        ? "Sequential Path"
                        : "თანმიმდევრული მარშრუტი"}
                    </th>
                    <th style={{ textAlign: "center" }}>
                      {language === "en" ? "Users" : "მომხმარებლები"}
                    </th>
                    <th style={{ textAlign: "center" }}>
                      {language === "en" ? "Avg Time (s)" : "საშ. დრო (წმ)"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.userJourneys.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          textAlign: "center",
                          padding: "2rem",
                          color: "#999",
                        }}
                      >
                        {language === "en"
                          ? "No user path data yet. Navigate through the site to generate paths. Data appears in 24-48 hours."
                          : "მომხმარებლის მარშრუტის მონაცემები ჯერ არ არის. ნავიგაცია გააკეთეთ საიტზე. მონაცემები 24-48 საათში გამოჩნდება."}
                      </td>
                    </tr>
                  ) : (
                    data.userJourneys.map((journey, index) => (
                      <tr key={index}>
                        <td
                          className="journey-path"
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.9rem",
                            color: "#2563eb",
                            fontWeight: "500",
                          }}
                        >
                          {journey.path}
                        </td>
                        <td
                          className="table-cell-number"
                          style={{
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#059669",
                          }}
                        >
                          {journey.count.toLocaleString()}
                        </td>
                        <td
                          className="table-cell-number"
                          style={{ textAlign: "center" }}
                        >
                          {journey.avgTime ? `${journey.avgTime}s` : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data.userJourneys.length > 0 && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "#1e40af",
                }}
              >
                <strong>{language === "en" ? "💡 Tip:" : "💡 რჩევა:"}</strong>{" "}
                {language === "en"
                  ? "The → arrow shows the order of pages visited. Use this to understand common conversion paths."
                  : "→ ისარი აჩვენებს გვერდების მონახულების თანმიმდევრობას. გამოიყენეთ კონვერსიის გზების გასაგებად."}
              </div>
            )}
          </section>

          {/* Section 4: Purchase Funnel */}
          <section className="ga4-section">
            <h2 className="ga4-section__title">
              🛒 {language === "en" ? "Purchase Funnel" : "შეძენის ფუნელი"}
            </h2>
            <div className="funnel-chart">
              {data.purchaseFunnel.map((step, index) => (
                <div key={index} className="funnel-step">
                  <div className="funnel-step__bar-container">
                    <div
                      className="funnel-step__bar"
                      style={{ width: `${step.percentage}%` }}
                    >
                      <span className="funnel-step__label">{step.step}</span>
                    </div>
                  </div>
                  <div className="funnel-step__stats">
                    <span className="funnel-step__count">
                      {step.count.toLocaleString()}{" "}
                      {language === "en" ? "users" : "მომხმარებელი"}
                    </span>
                    {step.dropoff !== undefined && (
                      <span
                        className="funnel-step__dropoff"
                        style={{
                          color: step.dropoff < 0 ? "#10b981" : "#ef4444",
                        }}
                      >
                        {-step.dropoff.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="funnel-summary">
              <p>
                <strong>
                  {language === "en"
                    ? "Conversion Rate:"
                    : "კონვერსიის მაჩვენებელი:"}
                </strong>{" "}
                {conversionRate}% (
                {data.purchaseFunnel[data.purchaseFunnel.length - 1]?.count ||
                  0}{" "}
                {language === "en" ? "purchases from" : "შესყიდვა"}{" "}
                {data.purchaseFunnel[0]?.count || 0}{" "}
                {language === "en" ? "cart additions" : "კალათაში დამატებიდან"})
              </p>
            </div>
          </section>

          {/* Section 5: Errors & API Metrics */}
          <div className="ga4-section-row">
            <section className="ga4-section ga4-section--half">
              <h2 className="ga4-section__title">
                ⚠️ {language === "en" ? "Errors" : "შეცდომები"}
              </h2>
              <div className="error-list">
                {data.errors.map((error, index) => (
                  <div key={index} className="error-item-expandable">
                    <div
                      className="error-item-header"
                      onClick={() => handleErrorTypeClick(error.type)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="error-item-info">
                        <span className="error-item__type">{error.type}</span>
                        <span className="error-item__count">{error.count}</span>
                      </div>
                      <span className="expand-icon">
                        {expandedErrorType === error.type ? "▼" : "▶"}
                      </span>
                    </div>

                    {expandedErrorType === error.type && (
                      <div className="error-details">
                        {isLoadingErrors ? (
                          <div className="loading-details">
                            <div className="spinner"></div>
                            <p>
                              {language === "en"
                                ? "Loading error details..."
                                : "იტვირთება დეტალები..."}
                            </p>
                          </div>
                        ) : detailedErrors ? (
                          <div className="detailed-errors">
                            {/* Info Box */}
                            <div
                              style={{
                                background: "#fff3cd",
                                border: "1px solid #ffc107",
                                borderRadius: "8px",
                                padding: "1rem",
                                marginBottom: "1rem",
                                fontSize: "0.9rem",
                              }}
                            >
                              <strong>
                                ℹ️ {language === "en" ? "Note:" : "შენიშვნა:"}
                              </strong>
                              <p style={{ margin: "0.5rem 0 0 0" }}>
                                {language === "en"
                                  ? "Error details show event counts from GA4. For exact error messages, check browser console logs with [GA4 Error Tracking] prefix."
                                  : "ერორის დეტალები აჩვენებს მოვლენების რაოდენობას GA4-დან. ზუსტი error message-ებისთვის შეამოწმეთ browser console logs [GA4 Error Tracking] პრეფიქსით."}
                              </p>
                            </div>

                            {/* Error Stats */}
                            <div className="error-stats">
                              <div className="stat-box">
                                <div className="stat-label">
                                  {language === "en"
                                    ? "Total Errors"
                                    : "სულ შეცდომები"}
                                </div>
                                <div className="stat-value">
                                  {detailedErrors.total.toLocaleString()}
                                </div>
                              </div>
                              <div className="stat-box">
                                <div className="stat-label">
                                  {language === "en" ? "Period" : "პერიოდი"}
                                </div>
                                <div className="stat-value">
                                  {detailedErrors.period}
                                </div>
                              </div>
                            </div>

                            {/* Top Failing Endpoints */}
                            {detailedErrors.topFailingEndpoints.length > 0 && (
                              <div className="error-subsection">
                                <h4>
                                  {language === "en"
                                    ? "Top Failing Endpoints"
                                    : "ყველაზე პრობლემური ენდპოინტები"}
                                  <span className="subsection-count">
                                    ({detailedErrors.topFailingEndpoints.length}
                                    )
                                  </span>
                                </h4>
                                <div className="endpoint-list">
                                  {detailedErrors.topFailingEndpoints
                                    .slice(0, 10)
                                    .map((ep, idx) => (
                                      <div key={idx} className="endpoint-item">
                                        <span className="endpoint-path">
                                          {ep.endpoint}
                                        </span>
                                        <span className="endpoint-count">
                                          {ep.count}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Status Code Distribution */}
                            {detailedErrors.statusDistribution.length > 0 && (
                              <div className="error-subsection">
                                <h4>
                                  {language === "en"
                                    ? "Status Code Distribution"
                                    : "სტატუს კოდების განაწილება"}
                                  <span className="subsection-count">
                                    ({detailedErrors.statusDistribution.length})
                                  </span>
                                </h4>
                                <div className="status-list">
                                  {detailedErrors.statusDistribution.map(
                                    (status, idx) => (
                                      <div key={idx} className="status-item">
                                        <div>
                                          <span
                                            className={`status-code ${status.category}`}
                                          >
                                            {status.status}
                                          </span>
                                          <span className="status-category">
                                            {status.category}
                                          </span>
                                        </div>
                                        <span className="status-count">
                                          {status.count}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Detailed Error List with Pagination */}
                            {detailedErrors.summary.length > 0 && (
                              <div className="error-subsection">
                                <h4>
                                  {language === "en"
                                    ? `All Errors (Page ${
                                        detailedErrors.pagination?.page || 1
                                      } of ${
                                        detailedErrors.pagination?.totalPages ||
                                        1
                                      })`
                                    : `ყველა შეცდომა (გვერდი ${
                                        detailedErrors.pagination?.page || 1
                                      } / ${
                                        detailedErrors.pagination?.totalPages ||
                                        1
                                      })`}
                                  <span className="subsection-count">
                                    (
                                    {detailedErrors.pagination?.totalItems || 0}{" "}
                                    {language === "en" ? "total" : "სულ"})
                                  </span>
                                </h4>

                                {detailedErrors.summary[0].details.length >
                                0 ? (
                                  <div className="error-details-table">
                                    {detailedErrors.summary[0].details.map(
                                      (detail, idx) => (
                                        <div
                                          key={idx}
                                          className="error-detail-row"
                                        >
                                          <div className="error-detail-message">
                                            <strong>
                                              {detail.message ||
                                                "Unknown error"}
                                            </strong>
                                          </div>
                                          <div className="error-detail-info">
                                            {detail.endpoint &&
                                              detail.endpoint !== "N/A" && (
                                                <span>
                                                  <strong>
                                                    {language === "en"
                                                      ? "Endpoint:"
                                                      : "ენდპოინტი:"}
                                                  </strong>{" "}
                                                  {detail.endpoint}
                                                </span>
                                              )}
                                            {detail.status &&
                                              detail.status !== "N/A" && (
                                                <span>
                                                  <strong>
                                                    {language === "en"
                                                      ? "Status:"
                                                      : "სტატუსი:"}
                                                  </strong>{" "}
                                                  {detail.status}
                                                </span>
                                              )}
                                            {detail.page &&
                                              detail.page !== "N/A" && (
                                                <span>
                                                  <strong>
                                                    {language === "en"
                                                      ? "Page:"
                                                      : "გვერდი:"}
                                                  </strong>{" "}
                                                  {detail.page}
                                                </span>
                                              )}
                                            <span>
                                              <strong>
                                                {language === "en"
                                                  ? "Count:"
                                                  : "რაოდენობა:"}
                                              </strong>{" "}
                                              {detail.count}
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <p
                                    style={{
                                      padding: "1rem",
                                      color: "#666",
                                      textAlign: "center",
                                    }}
                                  >
                                    {language === "en"
                                      ? "No errors on this page"
                                      : "ამ გვერდზე შეცდომები არ არის"}
                                  </p>
                                )}

                                {/* Pagination Controls - Always show if multiple pages */}
                                {detailedErrors.pagination &&
                                  detailedErrors.pagination.totalPages > 1 && (
                                    <div className="pagination-controls">
                                      <button
                                        className="pagination-btn"
                                        onClick={() =>
                                          handlePageChange(currentPage - 1)
                                        }
                                        disabled={
                                          !detailedErrors.pagination
                                            .hasPrevPage || isLoadingErrors
                                        }
                                      >
                                        ←{" "}
                                        {language === "en"
                                          ? "Previous"
                                          : "წინა"}
                                      </button>
                                      <span className="pagination-info">
                                        {language === "en" ? "Page" : "გვერდი"}{" "}
                                        {detailedErrors.pagination.page} /{" "}
                                        {detailedErrors.pagination.totalPages}
                                      </span>
                                      <button
                                        className="pagination-btn"
                                        onClick={() =>
                                          handlePageChange(currentPage + 1)
                                        }
                                        disabled={
                                          !detailedErrors.pagination
                                            .hasNextPage || isLoadingErrors
                                        }
                                      >
                                        {language === "en" ? "Next" : "შემდეგი"}{" "}
                                        →
                                      </button>
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p style={{ padding: "1rem", color: "#666" }}>
                            {language === "en"
                              ? "No detailed error data available"
                              : "დეტალური მონაცემები არ არის ხელმისაწვდომი"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="ga4-section ga4-section--half">
              <h2 className="ga4-section__title">
                🔌 {language === "en" ? "API Metrics" : "API მეტრიკები"}
              </h2>
              <div className="api-metrics">
                <div className="api-metric">
                  <span className="api-metric__label">
                    {language === "en" ? "Total Requests:" : "სულ მოთხოვნები:"}
                  </span>
                  <span className="api-metric__value">
                    {data.apiMetrics.total.toLocaleString()}
                  </span>
                </div>
                <div className="api-metric api-metric--success">
                  <span className="api-metric__label">
                    {language === "en" ? "Successful:" : "წარმატებული:"}
                  </span>
                  <span className="api-metric__value">
                    {data.apiMetrics.successful.toLocaleString()}
                  </span>
                </div>
                <div className="api-metric api-metric--error">
                  <span className="api-metric__label">
                    {language === "en" ? "Failed:" : "წარუმატებელი:"}
                  </span>
                  <span className="api-metric__value">
                    {data.apiMetrics.failed.toLocaleString()}
                  </span>
                </div>
                <div className="api-metric">
                  <span className="api-metric__label">
                    {language === "en" ? "Avg Duration:" : "საშ. ხანგრძლივობა:"}
                  </span>
                  <span className="api-metric__value">
                    {data.apiMetrics.avgDuration}ms
                  </span>
                </div>
                <div className="api-metric api-metric--rate">
                  <span className="api-metric__label">
                    {language === "en"
                      ? "Success Rate:"
                      : "წარმატების მაჩვენებელი:"}
                  </span>
                  <span className="api-metric__value">{successRate}%</span>
                </div>
              </div>
            </section>
          </div>

          <div className="ga4-dashboard__footer">
            <p>
              📊 {language === "en" ? "Powered by" : "გამოიყენება"} Google
              Analytics 4
            </p>
            <p>
              🔄 {language === "en" ? "Last updated:" : "ბოლო განახლება:"}{" "}
              {new Date().toLocaleString(language === "en" ? "en-US" : "ka-GE")}
            </p>
            <p className="ga4-dashboard__note">
              ℹ️{" "}
              {language === "en"
                ? "Note: Analytics data is fetched from Google Analytics 4. If GA4 is not configured, sample data is shown."
                : "შენიშვნა: ანალიტიკის მონაცემები მოდის Google Analytics 4-დან. თუ GA4 არ არის კონფიგურირებული, ნაჩვენებია ნიმუშის მონაცემები."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
