"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Store,
  ShoppingBag,
  TrendingUp,
  Filter,
} from "lucide-react";
import "./send-email.css";

type RecipientType = "sellers" | "customers" | "sales-managers";
type ActiveFilter = "all" | "active" | "inactive";

interface Recipient {
  _id: string;
  name: string;
  email: string;
  brandName?: string;
  salesRefCode?: string;
  isActive?: boolean;
}

interface SendResult {
  success: boolean;
  totalQueued?: number;
  message?: string;
  sent?: number;
  failed?: number;
  errors?: string[];
}

const recipientConfig = {
  sellers: {
    label: "სელერები",
    icon: Store,
    fetchUrl: "/users/admin/sellers-for-email",
    sendUrl: "/users/admin/send-bulk-email-sellers",
    idField: "sellerIds",
    color: "#4CAF50",
  },
  customers: {
    label: "მომხმარებლები",
    icon: ShoppingBag,
    fetchUrl: "/users/admin/customers-for-email",
    sendUrl: "/users/admin/send-bulk-email-customers",
    idField: "customerIds",
    color: "#2196F3",
  },
  "sales-managers": {
    label: "გაყიდვების მენეჯერები",
    icon: TrendingUp,
    fetchUrl: "/users/admin/sales-managers-for-email",
    sendUrl: "/users/admin/send-bulk-email-sales-managers",
    idField: "managerIds",
    color: "#9C27B0",
  },
};

export default function SendEmailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [recipientType, setRecipientType] = useState<RecipientType>("sellers");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  const config = recipientConfig[recipientType];
  const Icon = config.icon;

  useEffect(() => {
    if (!authLoading && (!user || user.role?.toLowerCase() !== Role.Admin)) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Reset selection when recipient type changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSearchQuery("");
    setResult(null);
    setActiveFilter("all");
  }, [recipientType]);

  // Fetch recipients
  const {
    data: recipients = [],
    isLoading: recipientsLoading,
    refetch,
  } = useQuery<Recipient[]>({
    queryKey: ["admin", "recipients-for-email", recipientType, activeFilter],
    queryFn: async () => {
      let url = config.fetchUrl;
      // Add activeFilter only for sellers
      if (recipientType === "sellers") {
        url = `${config.fetchUrl}?activeFilter=${activeFilter}`;
      }
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error("Failed to fetch recipients");
      return res.json();
    },
    enabled: !!user && user.role?.toLowerCase() === Role.Admin,
  });

  // Select all recipients when they load
  useEffect(() => {
    if (recipients.length > 0) {
      setSelectedIds(new Set(recipients.map((r) => r._id)));
    }
  }, [recipients]);

  const filteredRecipients = useMemo(() => {
    if (!searchQuery.trim()) return recipients;
    const query = searchQuery.toLowerCase();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        (r.brandName && r.brandName.toLowerCase().includes(query)) ||
        (r.salesRefCode && r.salesRefCode.toLowerCase().includes(query))
    );
  }, [recipients, searchQuery]);

  const allSelected = useMemo(
    () => recipients.length > 0 && selectedIds.size === recipients.length,
    [recipients.length, selectedIds.size]
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recipients.map((r) => r._id)));
    }
  };

  const toggleRecipient = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Send bulk email mutation
  const sendMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string }) => {
      const body: Record<string, unknown> = {
        subject: data.subject,
        message: data.message,
        [config.idField]: Array.from(selectedIds),
      };

      const res = await fetchWithAuth(config.sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to send emails");
      return res.json() as Promise<SendResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.success) {
        setSubject("");
        setMessage("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert("გთხოვთ შეავსოთ თემა და შეტყობინება");
      return;
    }
    if (selectedIds.size === 0) {
      alert("გთხოვთ აირჩიოთ მინიმუმ ერთი მიმღები");
      return;
    }
    if (
      !confirm(
        `დარწმუნებული ხართ რომ გსურთ ${
          selectedIds.size
        } ${config.label.toLowerCase()}სთვის მეილის გაგზავნა?`
      )
    ) {
      return;
    }
    setResult(null);
    sendMutation.mutate({ subject, message });
  };

  if (authLoading) {
    return (
      <div className="send-email-page">
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
    <div className="send-email-page">
      <div className="send-email-header">
        <div className="header-icon" style={{ backgroundColor: config.color }}>
          <Mail size={32} />
        </div>
        <div className="header-text">
          <h1>მეილების გაგზავნა</h1>
          <p>
            გაუგზავნეთ მეილი სელერებს, მომხმარებლებს ან გაყიდვების მენეჯერებს
          </p>
        </div>
      </div>

      {/* Recipient Type Selector */}
      <div className="recipient-type-selector">
        {(Object.keys(recipientConfig) as RecipientType[]).map((type) => {
          const typeConfig = recipientConfig[type];
          const TypeIcon = typeConfig.icon;
          return (
            <button
              key={type}
              className={`recipient-type-btn ${
                recipientType === type ? "active" : ""
              }`}
              onClick={() => setRecipientType(type)}
              style={
                recipientType === type
                  ? {
                      borderColor: typeConfig.color,
                      backgroundColor: `${typeConfig.color}15`,
                    }
                  : undefined
              }
            >
              <TypeIcon
                size={20}
                style={
                  recipientType === type
                    ? { color: typeConfig.color }
                    : undefined
                }
              />
              <span>{typeConfig.label}</span>
            </button>
          );
        })}
      </div>

      <div className="send-email-content">
        {/* Left Panel - Recipients List */}
        <div className="recipients-panel">
          <div className="panel-header">
            <h3>
              <Icon size={20} style={{ color: config.color }} />
              {config.label} ({recipients.length})
            </h3>
            <div className="header-stats">
              <span className="selected-count">{selectedIds.size} არჩეული</span>
            </div>
          </div>

          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="ძებნა..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter for sellers only */}
          {recipientType === "sellers" && (
            <div className="filter-bar">
              <Filter size={18} />
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
                className="filter-select"
              >
                <option value="all">ყველა სელერი</option>
                <option value="active">აქტიური (პროდუქტი აქვს)</option>
                <option value="inactive">არააქტიური (პროდუქტი არ აქვს)</option>
              </select>
            </div>
          )}

          <div className="select-all-row">
            <button onClick={toggleSelectAll} className="select-all-btn">
              {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
              <span>{allSelected ? "ყველას მოხსნა" : "ყველას არჩევა"}</span>
            </button>
          </div>

          <div className="recipients-list">
            {recipientsLoading ? (
              <div className="loading-state">
                <Loader2 className="animate-spin" size={24} />
                <p>იტვირთება...</p>
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="empty-state">
                <Users size={32} />
                <p>მიმღებები ვერ მოიძებნა</p>
              </div>
            ) : (
              filteredRecipients.map((recipient) => (
                <div
                  key={recipient._id}
                  className={`recipient-item ${
                    selectedIds.has(recipient._id) ? "selected" : ""
                  }`}
                  onClick={() => toggleRecipient(recipient._id)}
                >
                  <div className="checkbox">
                    {selectedIds.has(recipient._id) ? (
                      <CheckSquare size={18} style={{ color: config.color }} />
                    ) : (
                      <Square size={18} />
                    )}
                  </div>
                  <div className="recipient-info">
                    <span className="recipient-name">{recipient.name}</span>
                    <span className="recipient-email">{recipient.email}</span>
                    {recipient.brandName && (
                      <span className="recipient-brand">
                        {recipient.brandName}
                      </span>
                    )}
                    {recipient.salesRefCode && (
                      <span className="recipient-refcode">
                        {recipient.salesRefCode}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Email Form */}
        <div className="email-form-panel">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="subject">
                <Mail size={18} />
                თემა
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="მეილის თემა..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">
                <Send size={18} />
                შეტყობინება
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="შეტყობინების ტექსტი..."
                rows={12}
                required
              />
            </div>

            <button
              type="submit"
              className="send-button"
              disabled={sendMutation.isPending || selectedIds.size === 0}
              style={{ backgroundColor: config.color }}
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  იგზავნება...
                </>
              ) : (
                <>
                  <Send size={20} />
                  გაგზავნა ({selectedIds.size} მიმღები)
                </>
              )}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div
              className={`result-message ${
                result.success ? "success" : "error"
              }`}
            >
              {result.success ? (
                <>
                  <CheckCircle size={24} />
                  <div>
                    <strong>წარმატებით გაიგზავნა!</strong>
                    {result.totalQueued !== undefined && (
                      <p>
                        {result.totalQueued} მეილი დაემატა რიგში გასაგზავნად
                      </p>
                    )}
                    {result.message && <p>{result.message}</p>}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={24} />
                  <div>
                    <strong>შეცდომა!</strong>
                    {result.errors?.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
