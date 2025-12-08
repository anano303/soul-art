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
  sent: number;
  failed: number;
  errors: string[];
}

export default function SellerNotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);
  const [selectedSellerIds, setSelectedSellerIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role?.toLowerCase() !== Role.Admin)) {
      router.push("/");
    }
  }, [user, authLoading, router]);

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
    }) => {
      const res = await fetchWithAuth("/users/admin/send-bulk-email-sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
    if (selectedSellerIds.size === 0) {
      alert("გთხოვთ აირჩიოთ მინიმუმ ერთი სელერი");
      return;
    }
    if (
      !confirm(
        `დარწმუნებული ხართ რომ გსურთ ${selectedSellerIds.size} სელერისთვის მეილის გაგზავნა?`
      )
    ) {
      return;
    }
    setResult(null);
    sendMutation.mutate({
      subject,
      message,
      sellerIds: Array.from(selectedSellerIds),
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
          <Store size={32} />
        </div>
        <div className="header-text">
          <h1>სელერებისთვის შეტყობინება</h1>
          <p>გაუგზავნეთ მეილი სელერებს ინდივიდუალურად</p>
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
                    <strong>წარმატებით გაიგზავნა!</strong>
                    <span>{result.sent} მეილი გაიგზავნა</span>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={24} />
                  <div className="result-content">
                    <strong>შეცდომა</strong>
                    <span>
                      გაიგზავნა: {result.sent}, წარუმატებელი: {result.failed}
                    </span>
                    {result.errors.length > 0 && (
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
    </div>
  );
}
