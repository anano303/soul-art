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

export default function GA4Dashboard() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
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
    
    const fetchAnalytics = async () => {
      try {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/analytics/ga4?days=${days}`,
          {
            credentials: "include",
          }
        );
        
        if (response.ok) {
          const analyticsData = await response.json();
          setData(analyticsData);
        } else {
          console.error("Failed to fetch analytics:", response.status);
          // Keep showing sample data on error
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        // Keep showing sample data on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [timeRange]);

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
        </div>

        <div className="ga4-dashboard__time-range">
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
                {language === "en" ? "Conversion Rate" : "კონვერსიის მაჩვენებელი"}
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

          {/* Section 3: User Journeys */}
          <section className="ga4-section">
            <h2 className="ga4-section__title">
              🗺️{" "}
              {language === "en"
                ? "Top User Journeys"
                : "ყველაზე გავრცელებული მარშრუტები"}
            </h2>
            <div className="ga4-table">
              <table>
                <thead>
                  <tr>
                    <th>{language === "en" ? "Path" : "მარშრუტი"}</th>
                    <th>{language === "en" ? "Users" : "მომხმარებლები"}</th>
                    <th>{language === "en" ? "Avg Time (s)" : "საშ. დრო (წმ)"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.userJourneys.map((journey, index) => (
                    <tr key={index}>
                      <td className="journey-path">{journey.path}</td>
                      <td className="table-cell-number">{journey.count}</td>
                      <td className="table-cell-number">
                        {journey.avgTime || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: Purchase Funnel */}
          <section className="ga4-section">
            <h2 className="ga4-section__title">
              🛒{" "}
              {language === "en"
                ? "Purchase Funnel"
                : "შეძენის ფუნელი"}
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
                      {step.count.toLocaleString()} {language === "en" ? "users" : "მომხმარებელი"}
                    </span>
                    {step.dropoff !== undefined && (
                      <span className="funnel-step__dropoff">
                        -{step.dropoff.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="funnel-summary">
              <p>
                <strong>{language === "en" ? "Conversion Rate:" : "კონვერსიის მაჩვენებელი:"}</strong>{" "}
                {conversionRate}% (
                {data.purchaseFunnel[data.purchaseFunnel.length - 1]?.count || 0}{" "}
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
                  <div key={index} className="error-item">
                    <span className="error-item__type">{error.type}</span>
                    <span className="error-item__count">{error.count}</span>
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
                    {language === "en" ? "Success Rate:" : "წარმატების მაჩვენებელი:"}
                  </span>
                  <span className="api-metric__value">{successRate}%</span>
                </div>
              </div>
            </section>
          </div>

          <div className="ga4-dashboard__footer">
            <p>
              📊 {language === "en" ? "Powered by" : "გამოიყენება"} Google Analytics 4
            </p>
            <p>
              🔄 {language === "en" ? "Last updated:" : "ბოლო განახლება:"}{" "}
              {new Date().toLocaleString(language === "en" ? "en-US" : "ka-GE")}
            </p>
            <p className="ga4-dashboard__note">
              ℹ️ {language === "en" 
                ? "Note: Analytics data is fetched from Google Analytics 4. If GA4 is not configured, sample data is shown."
                : "შენიშვნა: ანალიტიკის მონაცემები მოდის Google Analytics 4-დან. თუ GA4 არ არის კონფიგურირებული, ნაჩვენებია ნიმუშის მონაცემები."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
