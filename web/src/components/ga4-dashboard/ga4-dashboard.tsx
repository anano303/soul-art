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
  summaryMetrics: {
    totalUsers: number;
    newUsers: number;
    sessions: number;
    screenPageViews: number;
    bounceRate: number;
    avgSessionDuration: number;
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

interface LiveUserData {
  id: string;
  ip?: string;
  page: string;
  pages?: string[]; // ყველა გვერდი რაზეც იყო
  device: string;
  browser: string;
  location: string;
  country: string;
  city: string;
  source: string;
  pageViews: number;
  userType: string;
  activeUsers: number;
  sessionId?: string;
  lastActivity?: string;
  userName?: string;
  userEmail?: string;
}

interface RealtimeData {
  activeUsers: number;
  totalSessions: number;
  users: LiveUserData[];
  timestamp: string;
  error?: string;
}

interface ChatAnalyticsData {
  totalChats: number;
  totalMessages: number;
  aiResponses: number;
  facebookClicks: number;
  productClicks: number;
  errors: number;
  byDay: { date: string; messages: number }[];
}

interface ChatLogData {
  logs: Array<{
    _id: string;
    sessionId: string;
    userIp?: string;
    role: "user" | "assistant";
    message: string;
    responseTime?: number;
    createdAt: string;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

interface ChatSession {
  _id: string;
  userIp?: string;
  messageCount: number;
  userMessages: number;
  firstMessage: string;
  lastMessage: string;
  startTime: string;
  endTime: string;
}

interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  userMessages: number;
  aiResponses: number;
  avgMessagesPerSession: number;
  avgResponseTime: number;
  topQueries: { query: string; count: number }[];
}

interface DauData {
  dauToday: number;
  dailyData: Array<{ date: string; activeUsers: number }>;
}

export default function GA4Dashboard() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"1d" | "7d" | "30d" | "90d">("1d");
  const [expandedErrorType, setExpandedErrorType] = useState<string | null>(
    null,
  );
  const [detailedErrors, setDetailedErrors] =
    useState<DetailedErrorData | null>(null);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLiveUsers, setShowLiveUsers] = useState(false);
  const [liveUsersData, setLiveUsersData] = useState<RealtimeData | null>(null);
  const [liveUsersLoading, setLiveUsersLoading] = useState(false);
  const [dauData, setDauData] = useState<DauData | null>(null);
  const [dauDays, setDauDays] = useState<7 | 30 | 90>(30);
  const [dauLoading, setDauLoading] = useState(false);
  const [dauTooltip, setDauTooltip] = useState<{
    date: string;
    activeUsers: number;
    x: number;
    y: number;
  } | null>(null);
  const [chatAnalytics, setChatAnalytics] = useState<ChatAnalyticsData | null>(
    null,
  );

  // ჩატის ისტორიის state-ები
  const [activeTab, setActiveTab] = useState<"analytics" | "chat-history">(
    "analytics",
  );
  const [chatLogs, setChatLogs] = useState<ChatLogData | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [chatLogsLoading, setChatLogsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSending, setEmailSending] = useState(false);

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
    summaryMetrics: {
      totalUsers: 0,
      newUsers: 0,
      sessions: 0,
      screenPageViews: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
    },
  });

  useEffect(() => {
    // Fetch real analytics data from backend
    setLoading(true);
    setError(null);
    setExpandedErrorType(null); // Reset expanded errors when changing period

    const fetchAnalytics = async (retryCount = 0) => {
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
          },
        );

        if (!response.ok) {
          // თუ 401/403 და პირველი ცდაა - სცადე ხელახლა
          if (
            (response.status === 401 || response.status === 403) &&
            retryCount < 2
          ) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return fetchAnalytics(retryCount + 1);
          }
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch analytics: ${response.status} ${errorText}`,
          );
        }

        const analyticsData = await response.json();
        setData(analyticsData);
        setError(null);

        // ჩატის ანალიტიკის fetch
        try {
          const chatResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/analytics/ga4/chat?days=${days}`,
            { credentials: "include" },
          );
          if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            setChatAnalytics(chatData);
          }
        } catch (chatError) {
          console.error("Error fetching chat analytics:", chatError);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch analytics data",
        );
      } finally {
        setLoading(false);
      }
    };

    // დაელოდე მცირე დროს რომ session დაინიციალიზდეს
    const timer = setTimeout(() => {
      fetchAnalytics();
    }, 100);

    return () => clearTimeout(timer);
  }, [timeRange]);

  // Auto-refresh live users every 30 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (showLiveUsers) {
      // Refresh every 30 seconds
      interval = setInterval(() => {
        fetchLiveUsers();
      }, 30000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [showLiveUsers]);

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
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/ga4/errors`,
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

  // Fetch real-time live users from both GA4 and our tracking
  const fetchLiveUsers = async () => {
    try {
      setLiveUsersLoading(true);

      // Fetch both GA4 and our visitor tracking
      const [ga4Response, visitorsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/ga4/realtime`, {
          credentials: "include",
        }).catch(() => null),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/live-visitors`, {
          credentials: "include",
        }).catch(() => null),
      ]);

      let ga4Data = null;
      let visitorsData = null;

      if (ga4Response && ga4Response.ok) {
        ga4Data = await ga4Response.json();
      }

      if (visitorsResponse && visitorsResponse.ok) {
        visitorsData = await visitorsResponse.json();
      }

      // Combine data - prioritize our tracking (has IP)
      const combinedUsers =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visitorsData?.visitors?.map((v: any) => ({
          id: v.id,
          sessionId: v.id,
          ip: v.ip,
          page: v.page,
          pages: v.pages || [], // ყველა გვერდი რაზეც იყო
          device: v.device,
          browser: v.browser || v.os,
          location: (() => {
            const city = v.city && v.city !== "Unknown" ? v.city : null;
            const country =
              v.country && v.country !== "Unknown" ? v.country : null;

            if (city && country) {
              return `${city}, ${country}`;
            } else if (city) {
              return city;
            } else if (country) {
              return country;
            }
            return "Unknown";
          })(),
          pageViews: v.pageViews,
          activeUsers: 1,
          userName: v.userName,
          userEmail: v.userEmail,
        })) || [];

      setLiveUsersData({
        activeUsers: visitorsData?.total || ga4Data?.activeUsers || 0,
        totalSessions: combinedUsers.length,
        users: combinedUsers,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching live users:", error);
      setLiveUsersData({
        activeUsers: 0,
        totalSessions: 0,
        users: [],
        timestamp: new Date().toISOString(),
        error: "Failed to load data",
      });
    } finally {
      setLiveUsersLoading(false);
    }
  };

  // ========== ჩატის ისტორიის ფუნქციები ==========

  const fetchChatSessions = async () => {
    try {
      setChatLogsLoading(true);
      const days =
        timeRange === "1d"
          ? 1
          : timeRange === "7d"
            ? 7
            : timeRange === "30d"
              ? 30
              : 90;

      const [sessionsRes, statsRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/chat/admin/sessions?days=${days}`,
          {
            credentials: "include",
          },
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/chat/admin/stats?days=${days}`,
          {
            credentials: "include",
          },
        ),
      ]);

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setChatSessions(sessionsData.sessions || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setChatStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
    } finally {
      setChatLogsLoading(false);
    }
  };

  const fetchChatLogs = async (
    sessionId?: string,
    search?: string,
    page: number = 1,
  ) => {
    try {
      setChatLogsLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "50");
      if (sessionId) params.set("sessionId", sessionId);
      if (search) params.set("search", search);

      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/chat/admin/logs?${params.toString()}`,
        { credentials: "include" },
      );

      if (res.ok) {
        const data = await res.json();
        setChatLogs(data);
      }
    } catch (error) {
      console.error("Error fetching chat logs:", error);
    } finally {
      setChatLogsLoading(false);
    }
  };

  const handleEmailLogs = async () => {
    if (!emailAddress) {
      alert(language === "en" ? "Enter email address" : "შეიყვანეთ ემაილი");
      return;
    }

    try {
      setEmailSending(true);
      const days =
        timeRange === "1d"
          ? 1
          : timeRange === "7d"
            ? 7
            : timeRange === "30d"
              ? 30
              : 90;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/admin/logs/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: emailAddress,
            days,
            sessionId: selectedSession || undefined,
          }),
        },
      );

      const data = await res.json();
      if (data.success) {
        alert(
          language === "en"
            ? "Logs sent to email!"
            : "ლოგები გაიგზავნა ემაილზე!",
        );
      } else {
        alert(data.message || "Error");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert(
        language === "en" ? "Failed to send email" : "ემაილი ვერ გაიგზავნა",
      );
    } finally {
      setEmailSending(false);
    }
  };

  const handleClearLogs = async () => {
    const confirmMsg = selectedSession
      ? language === "en"
        ? "Delete this session's logs?"
        : "წავშალოთ ამ სესიის ლოგები?"
      : language === "en"
        ? "Delete ALL chat logs?"
        : "წავშალოთ ყველა ჩატის ლოგი?";

    if (!confirm(confirmMsg)) return;

    try {
      const params = new URLSearchParams();
      if (selectedSession) params.set("sessionId", selectedSession);

      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/chat/admin/logs?${params.toString()}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await res.json();
      if (data.success) {
        alert(
          language === "en"
            ? `Deleted ${data.deletedCount} logs`
            : `წაიშალა ${data.deletedCount} ლოგი`,
        );
        fetchChatSessions();
        setChatLogs(null);
        setSelectedSession(null);
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  };

  // ტაბის ცვლილებაზე ჩატის სესიების ჩატვირთვა
  useEffect(() => {
    if (activeTab === "chat-history") {
      fetchChatSessions();
    }
  }, [activeTab, timeRange]);

  const handleLiveUsersClick = () => {
    setShowLiveUsers(!showLiveUsers);
    if (!showLiveUsers && liveUsersData === null) {
      fetchLiveUsers();
    }
  };

  const fetchDau = async (days: number) => {
    try {
      setDauLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/analytics/daily-active-users?days=${days}`,
        { credentials: "include" },
      );
      if (res.ok) {
        const data = await res.json();
        setDauData(data);
      } else {
        setDauData(null);
      }
    } catch {
      setDauData(null);
    } finally {
      setDauLoading(false);
    }
  };

  useEffect(() => {
    fetchDau(dauDays);
  }, [dauDays]);

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              maxWidth: "100%",
            }}
          >
            <div>
              <h1 className="ga4-dashboard__title">
                📊{" "}
                {language === "en"
                  ? "Analytics Dashboard"
                  : "ანალიტიკის პანელი"}
              </h1>
              <p className="ga4-dashboard__subtitle">
                {language === "en"
                  ? "Google Analytics 4 - Comprehensive Website Analytics"
                  : "Google Analytics 4 - ვებსაიტის სრული ანალიტიკა"}
              </p>
            </div>

            {/* Live Users Button */}
            <button
              className="live-users-btn"
              onClick={handleLiveUsersClick}
              disabled={liveUsersLoading}
            >
              <span className="live-indicator"></span>
              {language === "en" ? "Live Users" : "ლაივ მომხმარებლები"}
            </button>
          </div>

          {/* Live Users Display */}
          {showLiveUsers && (
            <div className="live-users-panel">
              {liveUsersLoading ? (
                <div className="live-users-loading">
                  <div className="spinner"></div>
                  <span>
                    {language === "en" ? "Loading..." : "იტვირთება..."}
                  </span>
                </div>
              ) : liveUsersData ? (
                <div className="live-users-detailed">
                  {/* Summary Stats */}
                  <div className="live-users-summary">
                    <div className="live-stat-box">
                      <span className="live-stat-number">
                        {liveUsersData.activeUsers}
                      </span>
                      <span className="live-stat-label">
                        {language === "en"
                          ? "Active Users"
                          : "აქტიური მომხმარებელი"}
                      </span>
                    </div>
                    <div className="live-stat-box">
                      <span className="live-stat-number">
                        {liveUsersData.totalSessions}
                      </span>
                      <span className="live-stat-label">
                        {language === "en" ? "Sessions" : "სესიები"}
                      </span>
                    </div>
                    <button
                      className="refresh-btn-inline"
                      onClick={fetchLiveUsers}
                      disabled={liveUsersLoading}
                    >
                      🔄 {language === "en" ? "Refresh" : "განახლება"}
                    </button>
                  </div>

                  {/* Detailed Users Table */}
                  {liveUsersData.users.length > 0 ? (
                    <div className="live-users-table-wrapper">
                      <table className="live-users-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>
                              {language === "en" ? "User" : "მომხმარებელი"}
                            </th>
                            <th>{language === "en" ? "IP" : "IP"}</th>
                            <th>{language === "en" ? "Pages" : "გვერდები"}</th>
                            <th>
                              {language === "en" ? "Device" : "მოწყობილობა"}
                            </th>
                            <th>
                              {language === "en" ? "Platform" : "პლატფორმა"}
                            </th>
                            <th>
                              {language === "en"
                                ? "Location"
                                : "ადგილმდებარეობა"}
                            </th>
                            <th>{language === "en" ? "Views" : "ნახვები"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveUsersData.users.map((user, index) => (
                            <tr key={user.sessionId || user.id}>
                              <td>{index + 1}</td>
                              <td
                                className="table-cell-user"
                                title={user.userEmail || undefined}
                              >
                                {user.userName || (
                                  <span
                                    style={{
                                      color: "#999",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    {language === "en" ? "Guest" : "სტუმარი"}
                                  </span>
                                )}
                              </td>
                              <td className="table-cell-ip" title={user.ip}>
                                {user.ip || "—"}
                              </td>
                              <td className="table-cell-page">
                                {user.pages && user.pages.length > 0 ? (
                                  <div className="pages-list">
                                    {user.pages.map((page, pageIndex) => (
                                      <a
                                        key={pageIndex}
                                        href={page}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "#0066cc",
                                          textDecoration: "underline",
                                          display: "block",
                                          marginBottom:
                                            user.pages!.length > 1
                                              ? "4px"
                                              : "0",
                                          fontSize:
                                            user.pages!.length > 3
                                              ? "12px"
                                              : "14px",
                                        }}
                                        title={page}
                                      >
                                        {page.length > 40
                                          ? page.substring(0, 40) + "..."
                                          : page}
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <a
                                    href={user.page}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: "#0066cc",
                                      textDecoration: "underline",
                                    }}
                                  >
                                    {user.page}
                                  </a>
                                )}
                              </td>
                              <td className="table-cell-device">
                                {user.device}
                              </td>
                              <td>{user.browser}</td>
                              <td
                                className="table-cell-location"
                                title={user.location}
                              >
                                {user.location}
                              </td>
                              <td className="table-cell-center">
                                {user.pageViews}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="no-live-users">
                      <p>
                        {language === "en"
                          ? "No active users in the last 30 minutes"
                          : "ბოლო 30 წუთში აქტიური მომხმარებლები არ არიან"}
                      </p>
                    </div>
                  )}

                  <div className="live-users-footer">
                    <small>
                      {language === "en"
                        ? `Last updated: ${new Date(
                            liveUsersData.timestamp,
                          ).toLocaleTimeString()}`
                        : `ბოლო განახლება: ${new Date(
                            liveUsersData.timestamp,
                          ).toLocaleTimeString()}`}
                    </small>
                    <small style={{ opacity: 0.7 }}>
                      {language === "en"
                        ? "Auto-refreshes every 30 seconds"
                        : "ავტომატურად განახლდება ყოველ 30 წამში"}
                    </small>
                  </div>
                </div>
              ) : (
                <div className="live-users-error">
                  <p>
                    {language === "en"
                      ? "Failed to load live users data"
                      : "ვერ ჩაიტვირთა მონაცემები"}
                  </p>
                </div>
              )}
            </div>
          )}

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

        {/* ტაბები - ანალიტიკა vs ჩატის ისტორია */}
        <div className="ga4-dashboard__tabs">
          <button
            className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            📊 {language === "en" ? "Analytics" : "ანალიტიკა"}
          </button>
          <button
            className={`tab-btn ${
              activeTab === "chat-history" ? "active" : ""
            }`}
            onClick={() => setActiveTab("chat-history")}
          >
            💬 {language === "en" ? "AI Chat History" : "AI ჩატის ისტორია"}
          </button>
        </div>
      </div>

      {/* ჩატის ისტორიის ტაბი */}
      {activeTab === "chat-history" ? (
        <div className="chat-history-section">
          {chatLogsLoading ? (
            <div className="ga4-dashboard__loading">
              <div className="spinner"></div>
              <p>
                {language === "en" ? "Loading chat history..." : "იტვირთება..."}
              </p>
            </div>
          ) : (
            <>
              {/* ჩატის სტატისტიკა */}
              {chatStats && (
                <div className="ga4-dashboard__metrics">
                  <div className="metric-card">
                    <div className="metric-card__icon">💬</div>
                    <div className="metric-card__value">
                      {chatStats.totalSessions}
                    </div>
                    <div className="metric-card__label">
                      {language === "en" ? "Total Sessions" : "სულ სესიები"}
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__icon">📝</div>
                    <div className="metric-card__value">
                      {chatStats.totalMessages}
                    </div>
                    <div className="metric-card__label">
                      {language === "en" ? "Total Messages" : "სულ მესიჯები"}
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__icon">👤</div>
                    <div className="metric-card__value">
                      {chatStats.userMessages}
                    </div>
                    <div className="metric-card__label">
                      {language === "en" ? "User Messages" : "მომხმარებლის"}
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__icon">🤖</div>
                    <div className="metric-card__value">
                      {chatStats.aiResponses}
                    </div>
                    <div className="metric-card__label">
                      {language === "en" ? "AI Responses" : "AI პასუხები"}
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__icon">⏱️</div>
                    <div className="metric-card__value">
                      {chatStats.avgResponseTime}ms
                    </div>
                    <div className="metric-card__label">
                      {language === "en" ? "Avg Response" : "საშუალო პასუხი"}
                    </div>
                  </div>
                </div>
              )}

              {/* Email & Clear Actions */}
              <div className="chat-actions-bar">
                <div className="email-section">
                  <input
                    type="email"
                    placeholder={
                      language === "en" ? "Email address..." : "ემაილი..."
                    }
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="email-input"
                  />
                  <button
                    className="action-btn email-btn"
                    onClick={handleEmailLogs}
                    disabled={emailSending}
                  >
                    {emailSending ? "..." : "📧"}{" "}
                    {language === "en" ? "Send to Email" : "გაგზავნა"}
                  </button>
                </div>
                <button
                  className="action-btn clear-btn"
                  onClick={handleClearLogs}
                >
                  🗑️{" "}
                  {selectedSession
                    ? language === "en"
                      ? "Clear Session"
                      : "სესიის წაშლა"
                    : language === "en"
                      ? "Clear All"
                      : "ყველას წაშლა"}
                </button>
              </div>

              {/* Top Queries */}
              {chatStats && chatStats.topQueries.length > 0 && (
                <div className="ga4-dashboard__section">
                  <h3>
                    🔥 {language === "en" ? "Top Questions" : "ხშირი კითხვები"}
                  </h3>
                  <div className="top-queries-list">
                    {chatStats.topQueries.slice(0, 10).map((q, i) => (
                      <div key={i} className="query-item">
                        <span className="query-rank">#{i + 1}</span>
                        <span className="query-text">{q.query}</span>
                        <span className="query-count">{q.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sessions List */}
              <div className="ga4-dashboard__section">
                <h3>
                  📋 {language === "en" ? "Chat Sessions" : "ჩატის სესიები"}
                </h3>
                {chatSessions.length === 0 ? (
                  <p className="no-data">
                    {language === "en"
                      ? "No chat sessions found"
                      : "ჩატის სესიები ვერ მოიძებნა"}
                  </p>
                ) : (
                  <div className="sessions-list">
                    {chatSessions.map((session) => (
                      <div
                        key={session._id}
                        className={`session-card ${
                          selectedSession === session._id ? "selected" : ""
                        }`}
                        onClick={() => {
                          if (selectedSession === session._id) {
                            setSelectedSession(null);
                            setChatLogs(null);
                          } else {
                            setSelectedSession(session._id);
                            fetchChatLogs(session._id);
                          }
                        }}
                      >
                        <div className="session-header">
                          <span className="session-ip">
                            🌐 {session.userIp || "Unknown"}
                          </span>
                          <span className="session-time">
                            {new Date(session.startTime).toLocaleString(
                              "ka-GE",
                            )}
                          </span>
                        </div>
                        <div className="session-stats">
                          <span>
                            💬 {session.messageCount}{" "}
                            {language === "en" ? "messages" : "მესიჯი"}
                          </span>
                          <span>
                            👤 {session.userMessages}{" "}
                            {language === "en" ? "user" : "მომხმარებელი"}
                          </span>
                        </div>
                        <div className="session-preview">
                          <strong>
                            {language === "en" ? "First:" : "პირველი:"}
                          </strong>{" "}
                          {session.firstMessage?.substring(0, 50)}...
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Session Messages */}
              {selectedSession && chatLogs && (
                <div className="ga4-dashboard__section chat-messages-section">
                  <h3>💭 {language === "en" ? "Conversation" : "საუბარი"}</h3>
                  <div className="chat-messages">
                    {chatLogs.logs.map((log) => (
                      <div key={log._id} className={`chat-message ${log.role}`}>
                        <div className="message-header">
                          <span className="message-role">
                            {log.role === "user" ? "👤" : "🤖"}
                          </span>
                          <span className="message-time">
                            {new Date(log.createdAt).toLocaleTimeString(
                              "ka-GE",
                            )}
                          </span>
                          {log.responseTime && (
                            <span className="response-time">
                              {log.responseTime}ms
                            </span>
                          )}
                        </div>
                        <div className="message-content">{log.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ანალიტიკის ტაბი (არსებული კონტენტი) */
        <>
          {loading ? (
            <div className="ga4-dashboard__loading">
              <div className="spinner"></div>
              <p>
                {language === "en" ? "Loading analytics..." : "იტვირთება..."}
              </p>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="ga4-dashboard__metrics">
                <div className="metric-card metric-card--primary">
                  <div className="metric-card__icon">👥</div>
                  <div className="metric-card__value">
                    {(data.summaryMetrics?.totalUsers ?? 0).toLocaleString()}
                  </div>
                  <div className="metric-card__label">
                    {language === "en" ? "Total Users" : "სულ ვიზიტორები"}
                  </div>
                </div>

                <div className="metric-card metric-card--success">
                  <div className="metric-card__icon">🆕</div>
                  <div className="metric-card__value">
                    {(data.summaryMetrics?.newUsers ?? 0).toLocaleString()}
                  </div>
                  <div className="metric-card__label">
                    {language === "en" ? "New Users" : "ახალი მომხმარებლები"}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card__icon">🔄</div>
                  <div className="metric-card__value">
                    {(data.summaryMetrics?.sessions ?? 0).toLocaleString()}
                  </div>
                  <div className="metric-card__label">
                    {language === "en" ? "Sessions" : "სესიები"}
                  </div>
                </div>

                <div className="metric-card metric-card--info">
                  <div className="metric-card__icon">📄</div>
                  <div className="metric-card__value">
                    {(
                      data.summaryMetrics?.screenPageViews ?? 0
                    ).toLocaleString()}
                  </div>
                  <div className="metric-card__label">
                    {language === "en" ? "Page Views" : "გვერდის ნახვები"}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card__icon">↩️</div>
                  <div className="metric-card__value">
                    {(data.summaryMetrics?.bounceRate ?? 0).toFixed(1)}%
                  </div>
                  <div className="metric-card__label">
                    {language === "en" ? "Bounce Rate" : "Bounce Rate"}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card__icon">⏱️</div>
                  <div className="metric-card__value">
                    {(() => {
                      const s = data.summaryMetrics?.avgSessionDuration ?? 0;
                      const m = Math.floor(s / 60);
                      const sec = String(Math.round(s % 60)).padStart(2, "0");
                      return `${m}:${sec}`;
                    })()}
                  </div>
                  <div className="metric-card__label">
                    {language === "en" ? "Avg. Session" : "საშ. სესია"}
                  </div>
                </div>

                <div className="metric-card metric-card--warning">
                  <div className="metric-card__icon">⚠️</div>
                  <div className="metric-card__value">
                    {data.errors.reduce((sum, e) => sum + e.count, 0)}
                  </div>
                  <div className="metric-card__label">
                    {language === "en"
                      ? "Total Errors"
                      : "შეცდომების რაოდენობა"}
                  </div>
                </div>

                <div className="metric-card metric-card--primary">
                  <div className="metric-card__icon">🎯</div>
                  <div className="metric-card__value">{conversionRate}%</div>
                  <div className="metric-card__label">
                    {language === "en"
                      ? "Conversion Rate"
                      : "კონვერსია (checkout)"}
                  </div>
                </div>
              </div>

              {/* DAU + Funnel row (half width each), before AI Chat Analytics */}
              <div className="ga4-dau-funnel-row">
                <section className="dau-section dau-section--half">
                  <h3 className="dau-section__title">
                    📈{" "}
                    {language === "en"
                      ? "Daily Active Users (DAU)"
                      : "ყოველდღიური აქტიური მომხმარებლები (DAU)"}
                  </h3>
                  {dauLoading ? (
                    <div className="dau-loading">
                      <div className="spinner" />
                      <span>
                        {language === "en" ? "Loading..." : "იტვირთება..."}
                      </span>
                    </div>
                  ) : dauData ? (
                    <>
                      <div className="dau-today-row">
                        <div className="dau-today-card">
                          <span className="dau-today-value">
                            {/* Realtime active users is more accurate for "today".
                                Fall back to GA4 processed dauToday only if realtime unavailable. */}
                            {liveUsersData?.activeUsers != null &&
                            liveUsersData.activeUsers > 0
                              ? liveUsersData.activeUsers
                              : dauData.dauToday}
                          </span>
                          <span className="dau-today-label">
                            {language === "en"
                              ? liveUsersData?.activeUsers
                                ? "Active now (last 30min)"
                                : "Yesterday"
                              : liveUsersData?.activeUsers
                                ? "ეხლა აქტიური (30 წთ)"
                                : "გუშინ"}
                          </span>
                        </div>
                      </div>
                      <div className="dau-period-tabs">
                        {([7, 30, 90] as const).map((d) => (
                          <button
                            key={d}
                            className={`dau-period-tab ${dauDays === d ? "active" : ""}`}
                            onClick={() => setDauDays(d)}
                          >
                            {d === 7
                              ? language === "en"
                                ? "7 days"
                                : "7 დღე"
                              : d === 30
                                ? language === "en"
                                  ? "30 days"
                                  : "30 დღე"
                                : language === "en"
                                  ? "90 days"
                                  : "90 დღე"}
                          </button>
                        ))}
                      </div>
                      <div className="dau-chart-legend">
                        <span className="dau-chart-legend__dot" />
                        <span className="dau-chart-legend__text">
                          {language === "en"
                            ? "Active users"
                            : "აქტიური მომხმარებლები"}
                        </span>
                      </div>
                      <div
                        className="dau-chart-wrapper"
                        onMouseLeave={() => setDauTooltip(null)}
                      >
                        {(() => {
                          const rawData = dauData.dailyData;
                          const maxVal = Math.max(
                            ...rawData.map((x) => x.activeUsers),
                            1,
                          );
                          const vw = 800;
                          const vh = 280;
                          const pad = {
                            top: 20,
                            right: 16,
                            bottom: 36,
                            left: 48,
                          };
                          const chartW = vw - pad.left - pad.right;
                          const chartH = vh - pad.top - pad.bottom;
                          const n = rawData.length;
                          const yTicks = 5;
                          const formatY = (v: number) =>
                            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
                          const points = rawData.map((d, i) => {
                            const x =
                              pad.left +
                              (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
                            const y =
                              pad.top +
                              chartH -
                              (d.activeUsers / maxVal) * chartH;
                            return { x, y, ...d };
                          });
                          const linePath = points
                            .map(
                              (p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
                            )
                            .join(" ");
                          const areaPath =
                            linePath +
                            ` L ${points[points.length - 1].x} ${pad.top + chartH} L ${points[0].x} ${pad.top + chartH} Z`;
                          const labelStep =
                            n <= 7
                              ? 1
                              : n <= 14
                                ? 2
                                : n <= 30
                                  ? Math.ceil(n / 6)
                                  : Math.ceil(n / 8);
                          return (
                            <>
                              <svg
                                className="dau-line-chart"
                                viewBox={`0 0 ${vw} ${vh}`}
                                preserveAspectRatio="xMidYMid meet"
                                role="img"
                                aria-label="Daily active users over time"
                              >
                                <defs>
                                  <linearGradient
                                    id="dau-area-grad"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="0%"
                                      stopColor="#3b82f6"
                                      stopOpacity={0.18}
                                    />
                                    <stop
                                      offset="100%"
                                      stopColor="#3b82f6"
                                      stopOpacity={0.02}
                                    />
                                  </linearGradient>
                                </defs>
                                {Array.from({ length: yTicks }).map((_, i) => {
                                  const y =
                                    pad.top + (i / (yTicks - 1)) * chartH;
                                  const val =
                                    i === yTicks - 1
                                      ? 0
                                      : Math.round(
                                          (1 - i / (yTicks - 1)) * maxVal,
                                        );
                                  return (
                                    <g key={i}>
                                      <line
                                        x1={pad.left}
                                        y1={y}
                                        x2={pad.left + chartW}
                                        y2={y}
                                        className="dau-grid-line"
                                      />
                                      <text
                                        x={pad.left - 10}
                                        y={y + 4}
                                        textAnchor="end"
                                        className="dau-y-label"
                                      >
                                        {formatY(val)}
                                      </text>
                                    </g>
                                  );
                                })}
                                <path d={areaPath} fill="url(#dau-area-grad)" />
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                {points.map((p) => (
                                  <circle
                                    key={p.date}
                                    cx={p.x}
                                    cy={p.y}
                                    r={n > 60 ? 2 : 3}
                                    fill="#3b82f6"
                                    stroke="#fff"
                                    strokeWidth="1.5"
                                    className="dau-line-dot"
                                  />
                                ))}
                                {points.map((p) => (
                                  <rect
                                    key={`hit-${p.date}`}
                                    x={p.x - chartW / n / 2}
                                    y={pad.top}
                                    width={chartW / n}
                                    height={chartH}
                                    fill="transparent"
                                    onMouseEnter={(e) => {
                                      const svg =
                                        e.currentTarget.closest("svg");
                                      if (!svg) return;
                                      const rect = svg.getBoundingClientRect();
                                      const xPct = (p.x / vw) * rect.width;
                                      const yPct = (p.y / vh) * rect.height;
                                      setDauTooltip({
                                        date: p.date,
                                        activeUsers: p.activeUsers,
                                        x: xPct,
                                        y: yPct,
                                      });
                                    }}
                                    onMouseLeave={() => setDauTooltip(null)}
                                  />
                                ))}
                                {points
                                  .filter(
                                    (_, idx) =>
                                      idx % labelStep === 0 || idx === n - 1,
                                  )
                                  .map((p) => (
                                    <text
                                      key={`lbl-${p.date}`}
                                      x={p.x}
                                      y={vh - 10}
                                      textAnchor="middle"
                                      className="dau-axis-label"
                                    >
                                      {new Date(p.date).toLocaleDateString(
                                        language === "en" ? "en-US" : "ka-GE",
                                        { month: "short", day: "numeric" },
                                      )}
                                    </text>
                                  ))}
                              </svg>
                              {dauTooltip && (
                                <div
                                  className="dau-html-tooltip"
                                  style={{
                                    left: dauTooltip.x,
                                    top: dauTooltip.y,
                                  }}
                                >
                                  <div className="dau-html-tooltip__date">
                                    {new Date(
                                      dauTooltip.date,
                                    ).toLocaleDateString(
                                      language === "en" ? "en-US" : "ka-GE",
                                      {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                      },
                                    )}
                                  </div>
                                  <div className="dau-html-tooltip__value">
                                    <span className="dau-html-tooltip__dot" />
                                    {dauTooltip.activeUsers.toLocaleString()}{" "}
                                    {language === "en"
                                      ? "users"
                                      : "მომხმარებელი"}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <div className="dau-empty">
                      {language === "en"
                        ? "No DAU data available."
                        : "DAU მონაცემები არ არის."}
                    </div>
                  )}
                </section>
                <section className="ga4-section ga4-section--half funnel-section--half">
                  <h2 className="ga4-section__title">
                    🛒{" "}
                    {language === "en" ? "Purchase Funnel" : "შეძენის ფუნელი"}
                  </h2>
                  <div className="funnel-bars">
                    {data.purchaseFunnel.map((step, i) => {
                      const firstCount = data.purchaseFunnel[0]?.count || 1;
                      const pct =
                        firstCount > 0 ? (step.count / firstCount) * 100 : 0;
                      const barWidth = Math.max(pct, 3);
                      const dropoff =
                        step.dropoff !== undefined && i > 0
                          ? step.dropoff
                          : null;
                      const hue =
                        152 -
                        (i / Math.max(data.purchaseFunnel.length - 1, 1)) * 30;
                      return (
                        <div key={i} className="funnel-bar-row">
                          <div className="funnel-bar-track">
                            <div
                              className="funnel-bar-fill"
                              style={{
                                width: `${barWidth}%`,
                                background: `linear-gradient(90deg, hsl(${hue}, 72%, 32%) 0%, hsl(${hue}, 68%, 44%) 100%)`,
                              }}
                            />
                            <div className="funnel-bar-inner">
                              <span className="funnel-bar-name">
                                {step.step}
                              </span>
                              <span className="funnel-bar-stats">
                                <span className="funnel-bar-count">
                                  {step.count.toLocaleString()}
                                </span>
                                <span className="funnel-bar-pct">
                                  {pct.toFixed(0)}%
                                </span>
                                {dropoff !== null && (
                                  <span
                                    className={`funnel-bar-dropoff ${dropoff > 0 ? "funnel-bar-dropoff--loss" : "funnel-bar-dropoff--gain"}`}
                                  >
                                    {dropoff > 0 ? "▼" : "▲"}{" "}
                                    {Math.abs(dropoff).toFixed(1)}%
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="funnel-v2-summary">
                      <div className="funnel-v2-summary-label">
                        {language === "en"
                          ? "Overall conversion"
                          : "საერთო კონვერსია"}
                      </div>
                      <div className="funnel-v2-summary-value">
                        {conversionRate}%
                      </div>
                      <div className="funnel-v2-summary-detail">
                        {data.purchaseFunnel[data.purchaseFunnel.length - 1]
                          ?.count || 0}{" "}
                        {language === "en" ? "purchases" : "შესყიდვა"} →{" "}
                        {data.purchaseFunnel[0]?.count || 0}{" "}
                        {language === "en" ? "started" : "დაწყება"}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* AI Chat Analytics */}
              {chatAnalytics && (
                <section className="ga4-section">
                  <h2 className="ga4-section__title">
                    💬{" "}
                    {language === "en"
                      ? "AI Chat Analytics"
                      : "AI ჩატის ანალიტიკა"}
                  </h2>
                  <div
                    className="ga4-dashboard__metrics"
                    style={{ marginBottom: "1rem" }}
                  >
                    <div className="metric-card metric-card--primary">
                      <div className="metric-card__icon">💬</div>
                      <div className="metric-card__value">
                        {chatAnalytics.totalChats}
                      </div>
                      <div className="metric-card__label">
                        {language === "en" ? "Chat Opens" : "ჩატის გახსნა"}
                      </div>
                    </div>
                    <div className="metric-card metric-card--success">
                      <div className="metric-card__icon">📝</div>
                      <div className="metric-card__value">
                        {chatAnalytics.totalMessages}
                      </div>
                      <div className="metric-card__label">
                        {language === "en"
                          ? "Messages Sent"
                          : "გაგზავნილი შეტყობინებები"}
                      </div>
                    </div>
                    <div className="metric-card metric-card--info">
                      <div className="metric-card__icon">🤖</div>
                      <div className="metric-card__value">
                        {chatAnalytics.aiResponses}
                      </div>
                      <div className="metric-card__label">
                        {language === "en" ? "AI Responses" : "AI პასუხები"}
                      </div>
                    </div>
                    <div className="metric-card metric-card--secondary">
                      <div className="metric-card__icon">🛒</div>
                      <div className="metric-card__value">
                        {chatAnalytics.productClicks}
                      </div>
                      <div className="metric-card__label">
                        {language === "en"
                          ? "Product Clicks"
                          : "პროდუქტზე კლიკი"}
                      </div>
                    </div>
                  </div>
                  {chatAnalytics.byDay.length > 0 && (
                    <div className="ga4-table">
                      <table>
                        <thead>
                          <tr>
                            <th>{language === "en" ? "Date" : "თარიღი"}</th>
                            <th>
                              {language === "en" ? "Messages" : "შეტყობინებები"}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {chatAnalytics.byDay.slice(-7).map((day, idx) => (
                            <tr key={idx}>
                              <td>{day.date}</td>
                              <td>{day.messages}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

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
                          0,
                        );
                        const share = ((page.views / totalViews) * 100).toFixed(
                          1,
                        );

                        return (
                          <tr key={index}>
                            <td>
                              <div className="table-cell-main">{page.page}</div>
                              {page.title && (
                                <div className="table-cell-sub">
                                  {page.title}
                                </div>
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
                        <div className="event-card__details">
                          {event.details}
                        </div>
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
                    <strong>
                      {language === "en" ? "💡 Tip:" : "💡 რჩევა:"}
                    </strong>{" "}
                    {language === "en"
                      ? "The → arrow shows the order of pages visited. Use this to understand common conversion paths."
                      : "→ ისარი აჩვენებს გვერდების მონახულების თანმიმდევრობას. გამოიყენეთ კონვერსიის გზების გასაგებად."}
                  </div>
                )}
              </section>

              {/* Errors & API Metrics */}
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
                            <span className="error-item__type">
                              {error.type}
                            </span>
                            <span className="error-item__count">
                              {error.count}
                            </span>
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
                                    ℹ️{" "}
                                    {language === "en" ? "Note:" : "შენიშვნა:"}
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
                                {detailedErrors.topFailingEndpoints.length >
                                  0 && (
                                  <div className="error-subsection">
                                    <h4>
                                      {language === "en"
                                        ? "Top Failing Endpoints"
                                        : "ყველაზე პრობლემური ენდპოინტები"}
                                      <span className="subsection-count">
                                        (
                                        {
                                          detailedErrors.topFailingEndpoints
                                            .length
                                        }
                                        )
                                      </span>
                                    </h4>
                                    <div className="endpoint-list">
                                      {detailedErrors.topFailingEndpoints
                                        .slice(0, 10)
                                        .map((ep, idx) => (
                                          <div
                                            key={idx}
                                            className="endpoint-item"
                                          >
                                            <span
                                              className="endpoint-path"
                                              title={ep.endpoint}
                                              style={{
                                                wordBreak: "break-all",
                                                whiteSpace: "normal",
                                              }}
                                            >
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
                                {detailedErrors.statusDistribution.length >
                                  0 && (
                                  <div className="error-subsection">
                                    <h4>
                                      {language === "en"
                                        ? "Status Code Distribution"
                                        : "სტატუს კოდების განაწილება"}
                                      <span className="subsection-count">
                                        (
                                        {
                                          detailedErrors.statusDistribution
                                            .length
                                        }
                                        )
                                      </span>
                                    </h4>
                                    <div className="status-list">
                                      {detailedErrors.statusDistribution.map(
                                        (status, idx) => (
                                          <div
                                            key={idx}
                                            className="status-item"
                                          >
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
                                        ),
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
                                            detailedErrors.pagination
                                              ?.totalPages || 1
                                          })`
                                        : `ყველა შეცდომა (გვერდი ${
                                            detailedErrors.pagination?.page || 1
                                          } / ${
                                            detailedErrors.pagination
                                              ?.totalPages || 1
                                          })`}
                                      <span className="subsection-count">
                                        (
                                        {detailedErrors.pagination
                                          ?.totalItems || 0}{" "}
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
                                                    <span
                                                      style={{
                                                        wordBreak: "break-all",
                                                        whiteSpace: "normal",
                                                      }}
                                                      title={detail.endpoint}
                                                    >
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
                                          ),
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

                                    {/* Pagination Controls - Always show if pagination data exists */}
                                    {detailedErrors.pagination && (
                                      <div className="pagination-controls">
                                        <button
                                          className="pagination-btn"
                                          onClick={() =>
                                            handlePageChange(currentPage - 1)
                                          }
                                          disabled={
                                            !detailedErrors.pagination
                                              .hasPrevPage
                                          }
                                        >
                                          ←{" "}
                                          {language === "en"
                                            ? "Previous"
                                            : "წინა"}
                                        </button>
                                        <span className="pagination-info">
                                          {language === "en"
                                            ? "Page"
                                            : "გვერდი"}{" "}
                                          {detailedErrors.pagination.page} /{" "}
                                          {detailedErrors.pagination.totalPages}
                                          <span
                                            style={{
                                              marginLeft: "0.5rem",
                                              opacity: 0.7,
                                              fontSize: "0.85rem",
                                            }}
                                          >
                                            (
                                            {
                                              detailedErrors.pagination
                                                .totalItems
                                            }{" "}
                                            {language === "en"
                                              ? "total"
                                              : "სულ"}
                                            )
                                          </span>
                                        </span>
                                        <button
                                          className="pagination-btn"
                                          onClick={() =>
                                            handlePageChange(currentPage + 1)
                                          }
                                          disabled={
                                            !detailedErrors.pagination
                                              .hasNextPage
                                          }
                                        >
                                          {language === "en"
                                            ? "Next"
                                            : "შემდეგი"}{" "}
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
                        {language === "en"
                          ? "Total Requests:"
                          : "სულ მოთხოვნები:"}
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
                        {language === "en"
                          ? "Avg Duration:"
                          : "საშ. ხანგრძლივობა:"}
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
                  {new Date().toLocaleString(
                    language === "en" ? "en-US" : "ka-GE",
                  )}
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
        </>
      )}
    </div>
  );
}
