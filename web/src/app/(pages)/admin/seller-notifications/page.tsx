"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Role } from "@/types/role";
import {
  Mail,
  Send,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Search,
  BellRing,
} from "lucide-react";
import "./seller-notifications.css";

interface Seller {
  _id: string;
  name: string;
  email: string;
  brandName?: string;
}

interface SendResult {
  success: boolean;
  totalQueued?: number;
  message?: string;
  notificationsCreated?: number;
  // Legacy fields for backwards compatibility
  sent?: number;
  failed?: number;
  errors?: string[];
}

interface NotificationHistoryItem {
  id: string;
  title: string;
  message: string;
  category?: "admin" | "product" | "suggestion" | "system";
  createdAt: string;
  createdByUserName?: string;
  receivedByUsersCount: number;
  readByUsersCount: number;
  followedCount?: number;
  readByUsers: Array<{
    userId: string;
    name: string;
    email?: string;
    readAt: string;
  }>;
}

interface NotificationHistoryResponse {
  notifications: NotificationHistoryItem[];
  total: number;
}

interface SellerSuggestionItem {
  slug: string;
  label: string;
}

interface SellerSuggestionsResponse {
  suggestions: SellerSuggestionItem[];
}

interface RealSellerItem {
  slug: string;
  label: string;
  productCount: number;
}

export default function SellerNotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);
  const [selectedSellerIds, setSelectedSellerIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationMode, setNotificationMode] = useState<'header-only' | 'none'>('header-only');
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyCategory, setHistoryCategory] = useState<
    "all" | "admin" | "product" | "suggestion" | "system"
  >("all");
  const [historyOnlyUnread, setHistoryOnlyUnread] = useState(false);
  const [suggestionsDraft, setSuggestionsDraft] = useState("");
  const [suggestionsSaved, setSuggestionsSaved] = useState<
    "idle" | "saved" | "error"
  >("idle");
  const [suggestionSendResult, setSuggestionSendResult] = useState<{
    slug: string;
    sentTo: number;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role?.toLowerCase() !== Role.Admin)) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const { data: notificationsHistory, isLoading: historyLoading } = useQuery<NotificationHistoryResponse>({
    queryKey: [
      "admin",
      "seller-notifications-history",
      historyCategory,
      historySearchQuery,
      historyOnlyUnread,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "80",
        offset: "0",
      });

      if (historyCategory !== "all") {
        params.set("category", historyCategory);
      }
      if (historySearchQuery.trim()) {
        params.set("query", historySearchQuery.trim());
      }
      if (historyOnlyUnread) {
        params.set("onlyUnread", "true");
      }

      const res = await fetchWithAuth(
        `/users/admin/seller-notifications-history?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch notification history");
      return res.json();
    },
    enabled: !!user && user.role?.toLowerCase() === Role.Admin,
  });

  const { data: suggestionsResponse } = useQuery<SellerSuggestionsResponse>({
    queryKey: ["admin", "seller-notification-suggestions"],
    queryFn: async () => {
      const res = await fetchWithAuth("/settings/seller-notification-suggestions");
      if (!res.ok) throw new Error("Failed to fetch suggestion settings");
      return res.json();
    },
    enabled: !!user && user.role?.toLowerCase() === Role.Admin,
  });

  const saveSuggestionsMutation = useMutation({
    mutationFn: async (suggestions: SellerSuggestionItem[]) => {
      const res = await fetchWithAuth("/settings/seller-notification-suggestions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions }),
      });
      if (!res.ok) throw new Error("Failed to save suggestions");
      return res.json() as Promise<SellerSuggestionsResponse & { success: boolean }>;
    },
    onSuccess: () => {
      setSuggestionsSaved("saved");
      queryClient.invalidateQueries({
        queryKey: ["admin", "seller-notification-suggestions"],
      });
    },
    onError: () => {
      setSuggestionsSaved("error");
    },
  });

  const sendSuggestionMutation = useMutation({
    mutationFn: async (data: {
      artistSlug: string;
      artistLabel: string;
      customMessage?: string;
    }) => {
      const res = await fetchWithAuth("/users/admin/send-artist-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send suggestion");
      return res.json() as Promise<{ success: boolean; sentTo: number }>;
    },
    onSuccess: (data, variables) => {
      setSuggestionSendResult({
        slug: variables.artistSlug,
        sentTo: data.sentTo,
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "seller-notifications-history"],
      });
    },
  });

  // Fetch real sellers with slugs for suggestions
  const { data: realSellers = [] } = useQuery<RealSellerItem[]>({
    queryKey: ["admin", "sellers-with-slugs"],
    queryFn: async () => {
      const res = await fetchWithAuth("/users/admin/sellers-with-slugs");
      if (!res.ok) throw new Error("Failed to fetch sellers with slugs");
      return res.json();
    },
    enabled: !!user && user.role?.toLowerCase() === Role.Admin,
  });

  // Fetch sellers for preview
  const { data: sellers = [], isLoading: sellersLoading } = useQuery<Seller[]>({
    queryKey: ["admin", "sellers-for-email"],
    queryFn: async () => {
      const res = await fetchWithAuth("/users/admin/sellers-for-email");
      if (!res.ok) throw new Error("Failed to fetch sellers");
      return res.json();
    },
    enabled: !!user && user.role?.toLowerCase() === Role.Admin,
  });

  // Select all sellers when they load
  useEffect(() => {
    if (sellers.length > 0 && selectedSellerIds.size === 0) {
      setSelectedSellerIds(new Set(sellers.map((s) => s._id)));
    }
  }, [sellers]);

  useEffect(() => {
    const rows = suggestionsResponse?.suggestions ?? [];
    if (!rows.length) return;

    const text = rows.map((item) => `${item.label}|${item.slug}`).join("\n");
    setSuggestionsDraft(text);
  }, [suggestionsResponse?.suggestions]);

  const filteredSellers = useMemo(() => {
    if (!searchQuery.trim()) return sellers;
    const query = searchQuery.toLowerCase();
    return sellers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        (s.brandName && s.brandName.toLowerCase().includes(query))
    );
  }, [sellers, searchQuery]);

  const allSelected = useMemo(
    () => sellers.length > 0 && selectedSellerIds.size === sellers.length,
    [sellers.length, selectedSellerIds.size]
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedSellerIds(new Set());
    } else {
      setSelectedSellerIds(new Set(sellers.map((s) => s._id)));
    }
  };

  const toggleSeller = (sellerId: string) => {
    const newSet = new Set(selectedSellerIds);
    if (newSet.has(sellerId)) {
      newSet.delete(sellerId);
    } else {
      newSet.add(sellerId);
    }
    setSelectedSellerIds(newSet);
  };

  // Send bulk email mutation
  const sendMutation = useMutation({
    mutationFn: async (data: {
      subject: string;
      message: string;
      sellerIds: string[];
      notificationMode: 'header-only' | 'none';
    }) => {
      const res = await fetchWithAuth("/users/admin/send-bulk-email-sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send notifications");
      return res.json() as Promise<SendResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.success) {
        setSubject("");
        setMessage("");
        queryClient.invalidateQueries({
          queryKey: ["admin", "seller-notifications-history"],
        });
      }
    },
    onError: (error) => {
      setResult({
        success: false,
        sent: 0,
        failed: 0,
        errors: [error.message],
      });
    },
  });

  const handleSaveSuggestions = () => {
    const rows = suggestionsDraft
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed = rows
      .map((line) => {
        const [label, slug] = line.split("|");
        return {
          label: (label || "").trim(),
          slug: (slug || "").trim(),
        };
      })
      .filter((item) => item.label && item.slug);

    if (!parsed.length) {
      setSuggestionsSaved("error");
      return;
    }

    setSuggestionsSaved("idle");
    saveSuggestionsMutation.mutate(parsed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert("გთხოვთ შეავსოთ თემა და შეტყობინება");
      return;
    }
    if (selectedSellerIds.size === 0) {
      alert("გთხოვთ აირჩიოთ მინიმუმ ერთი სელერი");
      return;
    }
    if (notificationMode === 'none') {
      alert("შეტყობინების ტიპი აირჩიეთ");
      return;
    }
    if (
      !confirm(
        `დარწმუნებული ხართ რომ გსურთ ${selectedSellerIds.size} სელერისთვის header notification გაგზავნა?`
      )
    ) {
      return;
    }
    setResult(null);
    sendMutation.mutate({
      subject,
      message,
      sellerIds: Array.from(selectedSellerIds),
      notificationMode,
    });
  };

  if (authLoading) {
    return (
      <div className="notifications-page">
        <div className="loading-state">
          <Loader2 className="animate-spin" size={32} />
          <p>იტვირთება...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role?.toLowerCase() !== Role.Admin) {
    return null;
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="header-icon seller-icon">
          <BellRing size={32} />
        </div>
        <div className="header-text">
          <h1>Header Notifications</h1>
          <p>გაუგზავნეთ მნიშვნელოვანი შეტყობინებები სელერების ჰედერში რომელიც დაუხვდებათ როდესაც დაიყვანთ</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{sellers.length}</span>
            <span className="stat-label">სულ სელერი</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{selectedSellerIds.size}</span>
            <span className="stat-label">არჩეული</span>
          </div>
        </div>
      </div>

      <div className="notifications-grid">
        {/* Form Section */}
        <div className="notifications-card form-card">
          <div className="card-header">
            <Send size={22} />
            <h2>ახალი შეტყობინება</h2>
          </div>

          <form onSubmit={handleSubmit} className="notification-form">
            <div className="form-group">
              <label htmlFor="subject">
                <Mail size={16} />
                თემა
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="მაგ: მნიშვნელოვანი სიახლე"
                className="form-input"
                disabled={sendMutation.isPending}
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">
                <Mail size={16} />
                შეტყობინება
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="შეიყვანეთ შეტყობინების ტექსტი..."
                className="form-textarea"
                rows={12}
                disabled={sendMutation.isPending}
              />
            </div>

            <div className="form-group">
              <label>
                <BellRing size={16} />
                Notification Type
              </label>
              <div className="notification-mode-selector">
                <label className="mode-option">
                  <input
                    type="radio"
                    name="notificationMode"
                    value="none"
                    checked={notificationMode === 'none'}
                    onChange={(e) => setNotificationMode(e.target.value as 'none')}
                    disabled={sendMutation.isPending}
                  />
                  <span className="mode-option__label">არ გაიგზავნოს</span>
                  <span className="mode-option__desc">არ გაიგზავნოს შეტყობინება</span>
                </label>
                <label className="mode-option">
                  <input
                    type="radio"
                    name="notificationMode"
                    value="header-only"
                    checked={notificationMode === 'header-only'}
                    onChange={(e) => setNotificationMode(e.target.value as 'header-only')}
                    disabled={sendMutation.isPending}
                  />
                  <span className="mode-option__label">Header-ში გამოჩნდეს</span>
                  <span className="mode-option__desc">სელერებს დაუხვდებათ header notice-ში</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={
                sendMutation.isPending ||
                !subject.trim() ||
                !message.trim() ||
                selectedSellerIds.size === 0
              }
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  იგზავნება...
                </>
              ) : (
                <>
                  <Send size={20} />
                  გაგზავნა ({selectedSellerIds.size} სელერი)
                </>
              )}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div
              className={`result-banner ${
                result.success ? "success" : "error"
              }`}
            >
              {result.success ? (
                <>
                  <CheckCircle size={24} />
                  <div className="result-content">
                    <strong>Header notification გაიგზავნა!</strong>
                    <span>
                      {result.totalQueued
                        ? `${result.totalQueued} სელერს დაემატა header notification`
                        : result.message ||
                          `${result.sent || 0} ნოთიფიქეიშნი გაიგზავნა`}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={24} />
                  <div className="result-content">
                    <strong>შეცდომა</strong>
                    <span>
                      {result.message ||
                        `ნოთიფიქეიშნები ვერ მიაღწიეს`}
                    </span>
                    {result.errors && result.errors.length > 0 && (
                      <ul className="error-list">
                        {result.errors.slice(0, 3).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="suggestions-card">
            <div className="card-header">
              <BellRing size={18} />
              <h2>დღის შეთავაზებების სია</h2>
            </div>
            <p className="suggestions-help">
              თითო ხაზზე ფორმატი: სახელი|slug — ღილაკით შეგიძლიათ ხელით გაგზავნოთ ნებისმიერი
            </p>

            {/* Real sellers from DB with send buttons */}
            {realSellers.length > 0 && (
              <div className="suggestions-list">
                {realSellers.map((item) => (
                  <div key={item.slug} className="suggestion-item">
                    <div className="suggestion-item__info">
                      <strong>{item.label}</strong>
                      <span className="suggestion-item__slug">/@{item.slug}</span>
                      <span className="suggestion-item__count">{item.productCount} პროდუქტი</span>
                    </div>
                    <button
                      type="button"
                      className="suggestion-item__send-btn"
                      disabled={sendSuggestionMutation.isPending}
                      onClick={() => {
                        if (!confirm(`"${item.label}" — გაიგზავნოს ყველა მომხმარებელთან?`)) return;
                        setSuggestionSendResult(null);
                        sendSuggestionMutation.mutate({
                          artistSlug: item.slug,
                          artistLabel: item.label,
                        });
                      }}
                    >
                      <Send size={14} />
                      გაგზავნა
                    </button>
                    {suggestionSendResult?.slug === item.slug && (
                      <span className="suggestion-item__sent-badge">
                        ✓ {suggestionSendResult.sentTo} მომხმარებელს
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {realSellers.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: 13 }}>სელერები იტვირთება...</p>
            )}
          </div>
        </div>

        {/* Sellers Preview */}
        <div className="notifications-card recipients-card">
          <div className="card-header">
            <Users size={22} />
            <h2>სელერების სია</h2>
            <span className="recipients-count">
              {selectedSellerIds.size}/{sellers.length}
            </span>
          </div>

          <div className="recipients-controls">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="ძებნა სახელით ან მეილით..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {sellers.length > 0 && (
              <button
                type="button"
                className="select-all-btn"
                onClick={toggleSelectAll}
              >
                {allSelected ? (
                  <>
                    <CheckSquare size={18} />
                    მონიშვნის მოხსნა
                  </>
                ) : (
                  <>
                    <Square size={18} />
                    ყველას მონიშვნა
                  </>
                )}
              </button>
            )}
          </div>

          {sellersLoading ? (
            <div className="loading-state">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : sellers.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <p>სელერები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="recipients-list">
              {filteredSellers.map((seller) => (
                <div
                  key={seller._id}
                  className={`recipient-item ${
                    selectedSellerIds.has(seller._id) ? "selected" : ""
                  }`}
                  onClick={() => toggleSeller(seller._id)}
                >
                  <div className="recipient-checkbox">
                    {selectedSellerIds.has(seller._id) ? (
                      <CheckSquare size={20} className="checkbox-checked" />
                    ) : (
                      <Square size={20} className="checkbox-unchecked" />
                    )}
                  </div>
                  <div className="recipient-avatar">
                    {(seller.brandName || seller.name).charAt(0).toUpperCase()}
                  </div>
                  <div className="recipient-info">
                    <span className="recipient-name">
                      {seller.brandName || seller.name}
                    </span>
                    <span className="recipient-email">{seller.email}</span>
                  </div>
                </div>
              ))}
              {filteredSellers.length === 0 && searchQuery && (
                <div className="empty-state small">
                  <p>ძებნის შედეგი არ მოიძებნა</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="notifications-card history-card">
        <div className="card-header">
          <BellRing size={22} />
          <h2>გაგზავნილი შეტყობინებების ისტორია</h2>
          <span className="recipients-count">
            {notificationsHistory?.total || 0}
          </span>
        </div>

        <div className="history-filters">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="ძებნა თემით ან ტექსტით..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
            />
          </div>
          <select
            className="history-select"
            value={historyCategory}
            onChange={(e) =>
              setHistoryCategory(
                e.target.value as "all" | "admin" | "product" | "suggestion" | "system"
              )
            }
          >
            <option value="all">ყველა კატეგორია</option>
            <option value="admin">Admin</option>
            <option value="product">Product</option>
            <option value="suggestion">Suggestion</option>
            <option value="system">System</option>
          </select>
          <label className="history-unread-toggle">
            <input
              type="checkbox"
              checked={historyOnlyUnread}
              onChange={(e) => setHistoryOnlyUnread(e.target.checked)}
            />
            მხოლოდ არანანახი
          </label>
        </div>

        {historyLoading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={24} />
            <p>იტვირთება ისტორია...</p>
          </div>
        ) : !notificationsHistory?.notifications?.length ? (
          <div className="empty-state small">
            <p>ისტორია ცარიელია</p>
          </div>
        ) : (
          <div className="recipients-list history-list">
            {notificationsHistory.notifications.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-item__head">
                  <span className="recipient-name">{item.title}</span>
                  <span className="history-item__category">
                    {item.category || "system"}
                  </span>
                </div>
                <div className="recipient-email">{item.message}</div>
                <div className="history-item__meta">
                  <span>{new Date(item.createdAt).toLocaleString("ka-GE")}</span>
                  <span>მიღებული: {item.receivedByUsersCount}</span>
                  <span>ნანახი: {item.readByUsersCount}</span>
                  {item.followedCount != null && (
                    <span className="history-item__followed">გამოიწერა: {item.followedCount}</span>
                  )}
                </div>
                {!!item.readByUsers?.length && (
                  <div className="history-readers">
                    {item.readByUsers.slice(0, 6).map((reader) => (
                      <span key={`${item.id}-${reader.userId}-${reader.readAt}`}>
                        {reader.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
