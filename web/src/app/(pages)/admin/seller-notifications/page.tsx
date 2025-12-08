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
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);
  const [selectedSellerIds, setSelectedSellerIds] = useState<Set<string>>(new Set());

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

  const allSelected = useMemo(() => 
    sellers.length > 0 && selectedSellerIds.size === sellers.length,
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
    mutationFn: async (data: { subject: string; message: string; sellerIds: string[] }) => {
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
      sellerIds: Array.from(selectedSellerIds) 
    });
  };

  if (authLoading) {
    return (
      <div className="admin-container">
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
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <Mail size={28} />
          <div>
            <h1>სელერებისთვის შეტყობინება</h1>
            <p>გაუგზავნეთ მეილი ყველა სელერს ინდივიდუალურად</p>
          </div>
        </div>
      </div>

      <div className="admin-grid">
        {/* Form Section */}
        <div className="admin-card">
          <h2 className="admin-card-title">
            <Send size={20} />
            ახალი შეტყობინება
          </h2>

          <form onSubmit={handleSubmit} className="seller-notification-form">
            <div className="form-group">
              <label htmlFor="subject">თემა</label>
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
              <label htmlFor="message">შეტყობინება</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="შეიყვანეთ შეტყობინების ტექსტი..."
                className="form-textarea"
                rows={10}
                disabled={sendMutation.isPending}
              />
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={
                sendMutation.isPending || !subject.trim() || !message.trim() || selectedSellerIds.size === 0
              }
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  იგზავნება...
                </>
              ) : (
                <>
                  <Send size={18} />
                  გაგზავნა ({selectedSellerIds.size} სელერი)
                </>
              )}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div
              className={`notification-result ${
                result.success ? "success" : "error"
              }`}
            >
              {result.success ? (
                <>
                  <CheckCircle size={20} />
                  <span>წარმატებით გაიგზავნა {result.sent} მეილი!</span>
                </>
              ) : (
                <>
                  <AlertCircle size={20} />
                  <div>
                    <span>
                      გაიგზავნა: {result.sent}, წარუმატებელი: {result.failed}
                    </span>
                    {result.errors.length > 0 && (
                      <ul className="error-list">
                        {result.errors.slice(0, 5).map((err, i) => (
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
        <div className="admin-card">
          <div className="sellers-header">
            <h2 className="admin-card-title">
              <Users size={20} />
              სელერების სია ({selectedSellerIds.size}/{sellers.length})
            </h2>
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
            <p className="empty-state">სელერები არ მოიძებნა</p>
          ) : (
            <div className="sellers-list">
              {sellers.map((seller) => (
                <div 
                  key={seller._id} 
                  className={`seller-item ${selectedSellerIds.has(seller._id) ? 'selected' : ''}`}
                  onClick={() => toggleSeller(seller._id)}
                >
                  <div className="seller-checkbox">
                    {selectedSellerIds.has(seller._id) ? (
                      <CheckSquare size={20} className="checkbox-checked" />
                    ) : (
                      <Square size={20} className="checkbox-unchecked" />
                    )}
                  </div>
                  <div className="seller-info">
                    <span className="seller-name">
                      {seller.brandName || seller.name}
                    </span>
                    <span className="seller-email">{seller.email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .admin-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 24px;
        }

        @media (max-width: 1024px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }
        }

        .admin-header {
          background: linear-gradient(135deg, #012645, #0f4f75);
          padding: 24px;
          border-radius: 12px;
          color: white;
        }

        .admin-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .admin-header h1 {
          margin: 0;
          font-size: 24px;
        }

        .admin-header p {
          margin: 4px 0 0;
          opacity: 0.8;
          font-size: 14px;
        }

        .admin-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .admin-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 20px;
          font-size: 18px;
          color: #012645;
        }

        .seller-notification-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .form-input {
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 15px;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #012645;
        }

        .form-textarea {
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 15px;
          resize: vertical;
          min-height: 200px;
          font-family: inherit;
          line-height: 1.6;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #012645;
        }

        .admin-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .admin-btn-primary {
          background: linear-gradient(135deg, #012645, #0f4f75);
          color: white;
        }

        .admin-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(1, 38, 69, 0.3);
        }

        .admin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .notification-result {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
        }

        .notification-result.success {
          background: #ecfdf5;
          color: #059669;
        }

        .notification-result.error {
          background: #fef2f2;
          color: #dc2626;
        }

        .error-list {
          margin: 8px 0 0;
          padding-left: 20px;
          font-size: 13px;
        }

        .sellers-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .sellers-header .admin-card-title {
          margin: 0;
        }

        .select-all-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .select-all-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .sellers-list {
          max-height: 500px;
          overflow-y: auto;
        }

        .seller-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          border-radius: 8px;
          margin-bottom: 4px;
          transition: background-color 0.15s;
        }

        .seller-item:hover {
          background: #f9fafb;
        }

        .seller-item.selected {
          background: #ecfdf5;
        }

        .seller-item:last-child {
          border-bottom: none;
        }

        .seller-checkbox {
          flex-shrink: 0;
        }

        .checkbox-checked {
          color: #059669;
        }

        .checkbox-unchecked {
          color: #9ca3af;
        }

        .seller-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .seller-name {
          font-weight: 600;
          color: #374151;
        }

        .seller-email {
          font-size: 13px;
          color: #6b7280;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          gap: 12px;
          color: #6b7280;
        }

        .empty-state {
          text-align: center;
          color: #6b7280;
          padding: 40px;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
