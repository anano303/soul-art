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
  ShoppingBag,
} from "lucide-react";
import "../seller-notifications/seller-notifications.css";

interface Customer {
  _id: string;
  name: string;
  email: string;
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

export default function CustomerNotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role?.toLowerCase() !== Role.Admin)) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Fetch customers for preview
  const { data: customers = [], isLoading: customersLoading } = useQuery<
    Customer[]
  >({
    queryKey: ["admin", "customers-for-email"],
    queryFn: async () => {
      const res = await fetchWithAuth("/users/admin/customers-for-email");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
    enabled: !!user && user.role?.toLowerCase() === Role.Admin,
  });

  // Select all customers when they load
  useEffect(() => {
    if (customers.length > 0 && selectedCustomerIds.size === 0) {
      setSelectedCustomerIds(new Set(customers.map((c) => c._id)));
    }
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const allSelected = useMemo(
    () => customers.length > 0 && selectedCustomerIds.size === customers.length,
    [customers.length, selectedCustomerIds.size]
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(customers.map((c) => c._id)));
    }
  };

  const toggleCustomer = (customerId: string) => {
    const newSet = new Set(selectedCustomerIds);
    if (newSet.has(customerId)) {
      newSet.delete(customerId);
    } else {
      newSet.add(customerId);
    }
    setSelectedCustomerIds(newSet);
  };

  // Send bulk email mutation
  const sendMutation = useMutation({
    mutationFn: async (data: {
      subject: string;
      message: string;
      customerIds: string[];
    }) => {
      const res = await fetchWithAuth(
        "/users/admin/send-bulk-email-customers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
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
    if (selectedCustomerIds.size === 0) {
      alert("გთხოვთ აირჩიოთ მინიმუმ ერთი მომხმარებელი");
      return;
    }
    if (
      !confirm(
        `დარწმუნებული ხართ რომ გსურთ ${selectedCustomerIds.size} მომხმარებლისთვის მეილის გაგზავნა?`
      )
    ) {
      return;
    }
    setResult(null);
    sendMutation.mutate({
      subject,
      message,
      customerIds: Array.from(selectedCustomerIds),
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
        <div className="header-icon customer-icon">
          <ShoppingBag size={32} />
        </div>
        <div className="header-text">
          <h1>მომხმარებლებისთვის შეტყობინება</h1>
          <p>გაუგზავნეთ მეილი მომხმარებლებს ინდივიდუალურად</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{customers.length}</span>
            <span className="stat-label">სულ მომხმარებელი</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{selectedCustomerIds.size}</span>
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
                placeholder="მაგ: სპეციალური შეთავაზება"
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
                selectedCustomerIds.size === 0
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
                  გაგზავნა ({selectedCustomerIds.size} მომხმარებელი)
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

        {/* Customers Preview */}
        <div className="notifications-card recipients-card">
          <div className="card-header">
            <Users size={22} />
            <h2>მომხმარებლების სია</h2>
            <span className="recipients-count">
              {selectedCustomerIds.size}/{customers.length}
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
            {customers.length > 0 && (
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

          {customersLoading ? (
            <div className="loading-state">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : customers.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <p>მომხმარებლები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="recipients-list">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer._id}
                  className={`recipient-item ${
                    selectedCustomerIds.has(customer._id) ? "selected" : ""
                  }`}
                  onClick={() => toggleCustomer(customer._id)}
                >
                  <div className="recipient-checkbox">
                    {selectedCustomerIds.has(customer._id) ? (
                      <CheckSquare size={20} className="checkbox-checked" />
                    ) : (
                      <Square size={20} className="checkbox-unchecked" />
                    )}
                  </div>
                  <div className="recipient-avatar">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="recipient-info">
                    <span className="recipient-name">{customer.name}</span>
                    <span className="recipient-email">{customer.email}</span>
                  </div>
                </div>
              ))}
              {filteredCustomers.length === 0 && searchQuery && (
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
