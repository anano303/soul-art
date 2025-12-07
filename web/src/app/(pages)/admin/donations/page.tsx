"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { Heart, Users, TrendingUp, Calendar, Gift } from "lucide-react";
import "./admin-donations.css";

interface Donation {
  _id: string;
  amount: number;
  donorName: string;
  donorEmail: string;
  message: string;
  isAnonymous: boolean;
  showInSponsors: boolean;
  status: string;
  createdAt: string;
}

interface DonationStats {
  totalAmount: number;
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  averageDonation: number;
  topDonors: Array<{ donorName: string; totalAmount: number; count: number }>;
}

async function fetchDonations(page: number, limit: number, status?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (status) params.append("status", status);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/donations/admin/all?${params}`,
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Failed to fetch donations");
  return response.json();
}

async function fetchStats(): Promise<DonationStats> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/donations/admin/stats`,
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}

export default function AdminDonationsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const limit = 20;

  const { data: donationsData, isLoading: donationsLoading } = useQuery({
    queryKey: ["admin-donations", page, statusFilter],
    queryFn: () => fetchDonations(page, limit, statusFilter || undefined),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-donation-stats"],
    queryFn: fetchStats,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ka-GE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      completed: { label: "წარმატებული", className: "status-completed" },
      pending: { label: "მოლოდინში", className: "status-pending" },
      failed: { label: "წარუმატებელი", className: "status-failed" },
      refunded: { label: "დაბრუნებული", className: "status-refunded" },
    };
    return statusMap[status] || { label: status, className: "" };
  };

  return (
    <ProtectedRoute adminOnly={true}>
      <div className="admin-donations-container">
        <div className="admin-donations-header">
          <h1 className="admin-donations-title">
            <Heart className="title-icon" />
            დონაციები და სპონსორები
          </h1>
        </div>

        {/* Stats Cards */}
        {!statsLoading && stats && (
          <div className="donations-stats-grid">
            <div className="stat-card total">
              <div className="stat-card-icon">
                <Gift />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value">{stats.totalAmount} ₾</div>
                <div className="stat-card-label">სულ შემოსული</div>
              </div>
            </div>

            <div className="stat-card count">
              <div className="stat-card-icon">
                <Users />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value">{stats.completedCount}</div>
                <div className="stat-card-label">წარმატებული დონაცია</div>
              </div>
            </div>

            <div className="stat-card average">
              <div className="stat-card-icon">
                <TrendingUp />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value">{stats.averageDonation} ₾</div>
                <div className="stat-card-label">საშუალო დონაცია</div>
              </div>
            </div>

            <div className="stat-card pending">
              <div className="stat-card-icon">
                <Calendar />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value">{stats.pendingCount}</div>
                <div className="stat-card-label">მოლოდინში</div>
              </div>
            </div>
          </div>
        )}

        {/* Top Donors */}
        {!statsLoading && stats && stats.topDonors.length > 0 && (
          <div className="top-donors-section">
            <h2>🏆 საუკეთესო სპონსორები</h2>
            <div className="top-donors-list">
              {stats.topDonors.map((donor, index) => (
                <div key={index} className="top-donor-item">
                  <div className="donor-rank">#{index + 1}</div>
                  <div className="donor-info">
                    <div className="donor-name">{donor.donorName}</div>
                    <div className="donor-stats">{donor.count} დონაცია</div>
                  </div>
                  <div className="donor-amount">{donor.totalAmount} ₾</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="donations-filter">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="status-filter-select"
          >
            <option value="">ყველა სტატუსი</option>
            <option value="completed">წარმატებული</option>
            <option value="pending">მოლოდინში</option>
            <option value="failed">წარუმატებელი</option>
          </select>
        </div>

        {/* Donations Table */}
        {donationsLoading ? (
          <div className="donations-loading">მონაცემების ჩატვირთვა...</div>
        ) : donationsData?.donations?.length === 0 ? (
          <div className="no-donations">დონაციები არ მოიძებნა</div>
        ) : (
          <>
            <div className="donations-table-wrapper">
              <table className="donations-table">
                <thead>
                  <tr>
                    <th>თარიღი</th>
                    <th>დონორი</th>
                    <th>თანხა</th>
                    <th>შეტყობინება</th>
                    <th>სტატუსი</th>
                  </tr>
                </thead>
                <tbody>
                  {donationsData?.donations?.map((donation: Donation) => {
                    const statusInfo = getStatusBadge(donation.status);
                    return (
                      <tr key={donation._id}>
                        <td className="date-cell">
                          {formatDate(donation.createdAt)}
                        </td>
                        <td className="donor-cell">
                          <div className="donor-name-cell">
                            {donation.isAnonymous
                              ? "🎭 ანონიმური"
                              : donation.donorName}
                          </div>
                          {donation.donorEmail && !donation.isAnonymous && (
                            <div className="donor-email-cell">
                              {donation.donorEmail}
                            </div>
                          )}
                        </td>
                        <td className="amount-cell">{donation.amount} ₾</td>
                        <td className="message-cell">
                          {donation.message || "-"}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {donationsData?.pages > 1 && (
              <div className="donations-pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="pagination-btn"
                >
                  წინა
                </button>
                <span className="page-info">
                  გვერდი {page} / {donationsData.pages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(donationsData.pages, p + 1))
                  }
                  disabled={page === donationsData.pages}
                  className="pagination-btn"
                >
                  შემდეგი
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
