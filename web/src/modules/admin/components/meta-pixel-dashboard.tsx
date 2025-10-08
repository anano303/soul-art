"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart,
  Eye,
  MousePointer,
  CreditCard,
  Search,
  Activity,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Mail,
  Phone,
  Globe,
  AlertCircle,
} from "lucide-react";
import "./meta-pixel-dashboard.css";

interface MetaPixelInfo {
  pixelId: string;
  datasetId: string;
  appId: string;
  pageId: string;
  accessToken: string;
  owner: string;
  createdDate: string;
  status: string;
}

interface PixelEvent {
  name: string;
  count: number;
  lastFired: string;
  status: "active" | "inactive" | "pending";
}

interface RecentEvent {
  name: string;
  timestamp: string;
  url: string;
  browser: string;
  ip: string;
  email: string;
  phone: string;
  hasAdvancedMatching: boolean;
}

interface EventData {
  success: boolean;
  events: any[];
  eventSummary: {
    summary: Record<string, number>;
    recentEvents: RecentEvent[];
    advancedMatchingData: any[];
    totalEvents: number;
    eventsWithMatching: number;
    matchingRate: number;
  };
  lastUpdated: string;
}

export function MetaPixelDashboard() {
  const [copied, setCopied] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Meta Pixel configuration from environment variables
  const pixelInfo: MetaPixelInfo = {
    pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "1189697243076610",
    datasetId: "1189697243076610",
    appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "2385644865136914",
    pageId: process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID || "542501458957000",
    accessToken: "EAAQHWdqgWZCs...", // Masked in UI
    owner: "Ani Beroshvili",
    createdDate: "9 ოქტ. 2025",
    status: "ჩართულია",
  };

  // Fetch real-time event data from API
  const fetchEventData = async () => {
    try {
      setError(null);
      const response = await fetch("/api/admin/meta-pixel/events");

      if (!response.ok) {
        throw new Error("Failed to fetch event data");
      }

      const data = await response.json();
      setEventData(data);
    } catch (err: any) {
      console.error("Error fetching event data:", err);
      setError(err.message || "Failed to load event data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchEventData();

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchEventData, 120000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      title: "First-party Cookies",
      status: "ჩართულია",
      icon: <Activity className="feature-icon" />,
      description:
        "პირველი მხარის ქუქიები გააქტიურებულია მონაცემთა შეგროვებისთვის",
    },
    {
      title: "Automatic Advanced Matching",
      status: "ჩართულია",
      icon: <Users className="feature-icon" />,
      description:
        "ავტომატური დამატებითი შესატყვისობა მომხმარებელთა იდენტიფიკაციისთვის",
    },
    {
      title: "Core Setup",
      status: "გამორთული",
      icon: <MousePointer className="feature-icon" />,
      description: "ძირითადი პარამეტრების შეზღუდვა",
    },
    {
      title: "Track Events Automatically",
      status: "გამორთული",
      icon: <BarChart3 className="feature-icon" />,
      description: "ივენთების ავტომატური თვალთვალი კოდის გარეშე",
    },
  ];

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEventData();
  };

  const openFacebookEvents = () => {
    window.open(
      `https://business.facebook.com/events_manager2/list/pixel/${pixelInfo.pixelId}/test_events`,
      "_blank"
    );
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("ka-GE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  // Get tracked events with real counts
  const getTrackedEventsWithCounts = (): PixelEvent[] => {
    const eventNames = [
      "PageView",
      "ViewContent",
      "AddToCart",
      "InitiateCheckout",
      "Purchase",
      "Search",
      "SubscribedButtonClick",
      "Lead",
      "CompleteRegistration",
    ];

    return eventNames.map((name) => ({
      name,
      count: eventData?.eventSummary?.summary[name] || 0,
      lastFired: "Real-time tracking",
      status: "active" as const,
    }));
  };

  if (loading && !eventData) {
    return (
      <div className="meta-pixel-container">
        <div className="loading-state">
          <RefreshCw className="spinning" size={48} />
          <p>იტვირთება Meta Pixel მონაცემები...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="meta-pixel-container">
      {/* Header */}
      <div className="meta-pixel-header">
        <div className="header-content">
          <div className="header-title-section">
            <Activity className="header-icon" />
            <div>
              <h1 className="header-title">Meta Pixel Analytics</h1>
              <p className="header-subtitle">
                Facebook რეკლამისა და ანალიტიკის დეტალური ინფორმაცია
              </p>
              {eventData?.lastUpdated && (
                <p className="last-updated">
                  <Clock size={14} />
                  ბოლო განახლება: {formatTimestamp(eventData.lastUpdated)}
                </p>
              )}
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={handleRefresh}
              className={`refresh-btn ${isRefreshing ? "refreshing" : ""}`}
              disabled={isRefreshing}
            >
              <RefreshCw className={isRefreshing ? "spinning" : ""} />
              განახლება
            </button>
            <button onClick={openFacebookEvents} className="facebook-btn">
              <ExternalLink />
              Facebook Events Manager
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <AlertCircle />
          <span>{error}</span>
          <button onClick={handleRefresh}>სცადეთ ხელახლა</button>
        </div>
      )}

      {/* Main Content */}
      <div className="meta-pixel-content">
        {/* Stats Overview */}
        {eventData && (
          <div className="stats-overview">
            <div className="stat-card">
              <div className="stat-icon">
                <Activity className="icon" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{eventData.eventSummary.totalEvents}</div>
                <div className="stat-label">სულ ივენთი</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon success">
                <Users className="icon" />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  {eventData.eventSummary.eventsWithMatching}
                </div>
                <div className="stat-label">Advanced Matching</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon warning">
                <TrendingUp className="icon" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{eventData.eventSummary.matchingRate}%</div>
                <div className="stat-label">Matching Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Pixel Information Card */}
        <div className="info-card main-info-card">
          <h2 className="card-title">
            <BarChart3 className="card-icon" />
            Pixel Information
          </h2>

          <div className="info-grid">
            <div className="info-item">
              <label className="info-label">Dataset ID:</label>
              <div className="info-value-container">
                <code className="info-value">{pixelInfo.datasetId}</code>
                <button
                  onClick={() => handleCopy(pixelInfo.datasetId, "datasetId")}
                  className="copy-btn"
                  title="Copy"
                >
                  {copied === "datasetId" ? (
                    <Check className="copy-icon success" />
                  ) : (
                    <Copy className="copy-icon" />
                  )}
                </button>
              </div>
            </div>

            <div className="info-item">
              <label className="info-label">Pixel ID:</label>
              <div className="info-value-container">
                <code className="info-value">{pixelInfo.pixelId}</code>
                <button
                  onClick={() => handleCopy(pixelInfo.pixelId, "pixelId")}
                  className="copy-btn"
                  title="Copy"
                >
                  {copied === "pixelId" ? (
                    <Check className="copy-icon success" />
                  ) : (
                    <Copy className="copy-icon" />
                  )}
                </button>
              </div>
            </div>

            <div className="info-item">
              <label className="info-label">Facebook App ID:</label>
              <div className="info-value-container">
                <code className="info-value">{pixelInfo.appId}</code>
                <button
                  onClick={() => handleCopy(pixelInfo.appId, "appId")}
                  className="copy-btn"
                  title="Copy"
                >
                  {copied === "appId" ? (
                    <Check className="copy-icon success" />
                  ) : (
                    <Copy className="copy-icon" />
                  )}
                </button>
              </div>
            </div>

            <div className="info-item">
              <label className="info-label">Facebook Page ID:</label>
              <div className="info-value-container">
                <code className="info-value">{pixelInfo.pageId}</code>
                <button
                  onClick={() => handleCopy(pixelInfo.pageId, "pageId")}
                  className="copy-btn"
                  title="Copy"
                >
                  {copied === "pageId" ? (
                    <Check className="copy-icon success" />
                  ) : (
                    <Copy className="copy-icon" />
                  )}
                </button>
              </div>
            </div>

            <div className="info-item">
              <label className="info-label">Owner:</label>
              <span className="info-value">{pixelInfo.owner}</span>
            </div>

            <div className="info-item">
              <label className="info-label">შექმნის თარიღი:</label>
              <span className="info-value">{pixelInfo.createdDate}</span>
            </div>

            <div className="info-item">
              <label className="info-label">სტატუსი:</label>
              <span className="status-badge status-active">
                ● {pixelInfo.status}
              </span>
            </div>

            <div className="info-item">
              <label className="info-label">Owner Business:</label>
              <span className="info-value">SoulArt (ID: 1019356016247125)</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              {feature.icon}
              <div className="feature-content">
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <span
                  className={`feature-status ${
                    feature.status === "ჩართულია"
                      ? "status-active"
                      : "status-inactive"
                  }`}
                >
                  {feature.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tracked Events with Real Counts */}
        <div className="info-card">
          <h2 className="card-title">
            <TrendingUp className="card-icon" />
            Tracked Events (ივენთები რომელიც თვალყურს ვადევნებთ)
          </h2>

          <div className="events-grid">
            {getTrackedEventsWithCounts().map((event, index) => (
              <div key={index} className="event-card">
                <div className="event-header">
                  <span className="event-name">{event.name}</span>
                  <span className="event-status status-active">● აქტიური</span>
                </div>
                <div className="event-count-display">
                  <span className="event-count-number">{event.count}</span>
                  <span className="event-count-label">ივენთი</span>
                </div>
                <p className="event-description">{event.lastFired}</p>
                <div className="event-icon-container">
                  {event.name === "PageView" && <Eye className="event-icon" />}
                  {event.name === "ViewContent" && (
                    <MousePointer className="event-icon" />
                  )}
                  {event.name === "AddToCart" && (
                    <ShoppingCart className="event-icon" />
                  )}
                  {event.name === "InitiateCheckout" && (
                    <CreditCard className="event-icon" />
                  )}
                  {event.name === "Purchase" && <CreditCard className="event-icon" />}
                  {event.name === "Search" && <Search className="event-icon" />}
                  {event.name === "SubscribedButtonClick" && (
                    <MousePointer className="event-icon" />
                  )}
                  {event.name === "Lead" && <Users className="event-icon" />}
                  {event.name === "CompleteRegistration" && (
                    <Users className="event-icon" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        {eventData && eventData.eventSummary.recentEvents.length > 0 && (
          <div className="info-card">
            <h2 className="card-title">
              <Clock className="card-icon" />
              ბოლო ივენთები (Advanced Matching მონაცემებით)
            </h2>

            <div className="recent-events-list">
              {eventData.eventSummary.recentEvents.map((event, index) => (
                <div
                  key={index}
                  className={`recent-event-item ${
                    event.hasAdvancedMatching ? "has-matching" : ""
                  }`}
                >
                  <div className="event-main-info">
                    <div className="event-name-badge">{event.name}</div>
                    <div className="event-timestamp">
                      <Clock size={14} />
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>

                  {event.url && (
                    <div className="event-detail">
                      <Globe size={14} />
                      <span className="event-url">{event.url}</span>
                    </div>
                  )}

                  {event.hasAdvancedMatching && (
                    <div className="advanced-matching-info">
                      <span className="matching-badge">
                        ✓ Advanced Matching
                      </span>
                      <div className="matching-details">
                        {event.email && (
                          <span className="matching-param">
                            <Mail size={12} /> Email
                          </span>
                        )}
                        {event.phone && (
                          <span className="matching-param">
                            <Phone size={12} /> Phone
                          </span>
                        )}
                        {event.ip && (
                          <span className="matching-param">IP Address</span>
                        )}
                      </div>
                    </div>
                  )}

                  {event.browser && (
                    <div className="event-detail browser-info">
                      <span className="label">Browser:</span>
                      <span className="value">{event.browser.substring(0, 50)}...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Settings */}
        <div className="info-card">
          <h2 className="card-title">
            <Activity className="card-icon" />
            დამატებითი პარამეტრები
          </h2>

          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <h4 className="setting-title">Conversions API</h4>
                <p className="setting-description">
                  სერვერული ივენთების გაგზავნა უშუალოდ თქვენი სერვერიდან
                </p>
              </div>
              <button className="setting-action-btn">გააქტიურება</button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4 className="setting-title">Extend Attribution Uploads</h4>
                <p className="setting-description">
                  ატრიბუციის ატვირთვის გახანგრძლივება 90 დღემდე
                </p>
              </div>
              <span className="status-badge status-active">● ჩართულია</span>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4 className="setting-title">Auto Tracking</h4>
                <p className="setting-description">
                  კამპანიებისთვის ავტომატური თვალთვალის გააქტიურება
                </p>
              </div>
              <span className="status-badge status-active">● ჩართულია</span>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4 className="setting-title">Traffic Permissions</h4>
                <p className="setting-description">
                  ნებართვების დაყენება ვებსაიტებიდან ივენთების მისაღებად
                </p>
              </div>
              <button className="setting-action-btn secondary">კონფიგურაცია</button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="info-card">
          <h2 className="card-title">
            <ExternalLink className="card-icon" />
            სასარგებლო ბმულები
          </h2>

          <div className="links-grid">
            <a
              href={`https://business.facebook.com/events_manager2/list/pixel/${pixelInfo.pixelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link-card"
            >
              <BarChart3 className="link-icon" />
              <span>Events Manager</span>
              <ExternalLink className="link-external" />
            </a>

            <a
              href={`https://business.facebook.com/events_manager2/list/pixel/${pixelInfo.pixelId}/test_events`}
              target="_blank"
              rel="noopener noreferrer"
              className="link-card"
            >
              <Activity className="link-icon" />
              <span>Test Events</span>
              <ExternalLink className="link-external" />
            </a>

            <a
              href={`https://business.facebook.com/events_manager2/list/pixel/${pixelInfo.pixelId}/diagnostics`}
              target="_blank"
              rel="noopener noreferrer"
              className="link-card"
            >
              <TrendingUp className="link-icon" />
              <span>Diagnostics</span>
              <ExternalLink className="link-external" />
            </a>

            <a
              href="https://business.facebook.com/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="link-card"
            >
              <Users className="link-icon" />
              <span>Business Settings</span>
              <ExternalLink className="link-external" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
