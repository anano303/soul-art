"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAccessToken } from "@/lib/auth";
import { toast } from "react-hot-toast";
import "./referrals.css";

interface WithdrawalRequest {
  id: string;
  user: {
    name: string;
    email: string;
  };
  amount: number;
  method: string;
  accountDetails: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: {
    name: string;
    email: string;
  };
  rejectionReason?: string;
}

export default function AdminReferralsPage() {
  const { user } = useAuth();
  const [withdrawalRequests, setWithdrawalRequests] = useState<
    WithdrawalRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processForm, setProcessForm] = useState({
    status: "APPROVED" as "APPROVED" | "REJECTED",
    rejectionReason: "",
    transactionId: "",
  });

  const fetchWithdrawalRequests = useCallback(async () => {
    const token = getAccessToken();
    try {
      const url = selectedStatus
        ? `${process.env.NEXT_PUBLIC_API_URL}/referrals/admin/withdrawal/requests?status=${selectedStatus}`
        : `${process.env.NEXT_PUBLIC_API_URL}/referrals/admin/withdrawal/requests`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawalRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch withdrawal requests:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchWithdrawalRequests();
    }
  }, [user, fetchWithdrawalRequests]);

  const processWithdrawalRequest = async (requestId: string) => {
    const token = getAccessToken();
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/admin/withdrawal/${requestId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(processForm),
        }
      );

      if (response.ok) {
        toast.success("მოთხოვნა წარმატებით დამუშავდა!");
        setShowProcessModal(false);
        setProcessingId(null);
        setProcessForm({
          status: "APPROVED",
          rejectionReason: "",
          transactionId: "",
        });
        fetchWithdrawalRequests();
      } else {
        const error = await response.json();
        toast.error(error.message || "დამუშავება ვერ მოხერხდა");
      }
    } catch {
      toast.error("შეცდომა მოხდა");
    }
  };

  const openProcessModal = (requestId: string) => {
    setProcessingId(requestId);
    setShowProcessModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return "admin-ref-status-processed";
      case "PENDING":
        return "admin-ref-status-pending";
      case "REJECTED":
        return "admin-ref-status-rejected";
      default:
        return "admin-ref-text-gray-600 admin-ref-bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "მოლოდინში";
      case "PROCESSED":
        return "დამუშავებული";
      case "REJECTED":
        return "უარყოფილი";
      default:
        return status;
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="admin-referrals-page">
        <div className="admin-ref-container admin-ref-py-8">
          <p className="admin-ref-text-red-600 admin-ref-text-xl admin-ref-font-semibold">
            უფლება არ გაქვთ ამ გვერდის ნახვისა
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-referrals-page">
        <div className="admin-ref-flex admin-ref-justify-center admin-ref-items-center admin-ref-min-h-screen">
          <div className="admin-ref-animate-spin admin-ref-rounded-full admin-ref-w-12 admin-ref-h-12 admin-ref-border-b-2 admin-ref-border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-referrals-page">
      <div className="admin-ref-container admin-ref-py-8">
        <div className="admin-ref-flex admin-ref-justify-between admin-ref-items-center admin-ref-mb-8 admin-ref-flex-mobile">
          <h1 className="admin-ref-text-3xl admin-ref-font-bold admin-ref-text-gray-900">
            რეფერალების მართვა
          </h1>

          <div className="admin-ref-flex admin-ref-items-center admin-ref-gap-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="admin-ref-form-select"
            >
              <option value="">ყველა მოთხოვნა</option>
              <option value="PENDING">მოლოდინში</option>
              <option value="PROCESSED">დამუშავებული</option>
              <option value="REJECTED">უარყოფილი</option>
            </select>
          </div>
        </div>

        {/* გატანის მოთხოვნები */}
        <div className="admin-ref-card">
          <div className="admin-ref-p-6 admin-ref-border-b">
            <h3 className="admin-ref-text-xl admin-ref-font-semibold admin-ref-text-gray-900">
              ბალანსის გატანის მოთხოვნები
            </h3>
          </div>
          <div className="admin-ref-table-container">
            <table className="admin-ref-table">
              <thead>
                <tr>
                  <th>მომხმარებელი</th>
                  <th>თანხა</th>
                  <th>მეთოდი</th>
                  <th>ანგარიშის დეტალები</th>
                  <th>სტატუსი</th>
                  <th>თარიღი</th>
                  <th>მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="admin-ref-user-info">
                        <div className="admin-ref-user-name">
                          {request.user.name}
                        </div>
                        <div className="admin-ref-user-email">
                          {request.user.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-ref-money">
                        {request.amount.toFixed(2)} ლარი
                      </span>
                    </td>
                    <td className="admin-ref-text-gray-900">
                      {request.method === "BANK" ? "ბანკი" : "პეიბოქსი"}
                    </td>
                    <td>
                      <div className="admin-ref-account-details">
                        {request.accountDetails}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-ref-status-badge ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusText(request.status)}
                      </span>
                    </td>
                    <td className="admin-ref-text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString("ka-GE")}
                    </td>
                    <td>
                      {request.status === "PENDING" && (
                        <button
                          onClick={() => openProcessModal(request.id)}
                          className="admin-ref-btn admin-ref-btn-primary"
                        >
                          დამუშავება
                        </button>
                      )}
                      {request.status === "PROCESSED" &&
                        request.processedBy && (
                          <div className="admin-ref-processed-info">
                            <div className="admin-ref-font-medium">
                              დამუშავდა
                            </div>
                            <div className="admin-ref-text-sm">
                              {request.processedBy.name}
                            </div>
                          </div>
                        )}
                      {request.status === "REJECTED" && (
                        <div className="admin-ref-rejected-info">
                          <div className="admin-ref-font-medium">უარყოფილი</div>
                          {request.rejectionReason && (
                            <div className="admin-ref-rejection-reason">
                              მიზეზი: {request.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* დამუშავების მოდალი */}
        {showProcessModal && (
          <div className="admin-ref-modal-overlay">
            <div className="admin-ref-modal admin-ref-p-8">
              <h3 className="admin-ref-text-xl admin-ref-font-semibold admin-ref-mb-4 admin-ref-text-gray-900">
                მოთხოვნის დამუშავება
              </h3>

              <div className="admin-ref-mb-4">
                <label className="admin-ref-form-label">სტატუსი</label>
                <select
                  value={processForm.status}
                  onChange={(e) =>
                    setProcessForm({
                      ...processForm,
                      status: e.target.value as "APPROVED" | "REJECTED",
                    })
                  }
                  className="admin-ref-form-select"
                >
                  <option value="APPROVED">დამტკიცება</option>
                  <option value="REJECTED">უარყოფა</option>
                </select>
              </div>

              {processForm.status === "APPROVED" && (
                <div className="admin-ref-mb-4">
                  <label className="admin-ref-form-label">
                    ტრანზაქციის ID (არაუცილებელო)
                  </label>
                  <input
                    type="text"
                    value={processForm.transactionId}
                    onChange={(e) =>
                      setProcessForm({
                        ...processForm,
                        transactionId: e.target.value,
                      })
                    }
                    className="admin-ref-form-input"
                    placeholder="ბანკის ტრანზაქციის ID"
                  />
                </div>
              )}

              {processForm.status === "REJECTED" && (
                <div className="admin-ref-mb-4">
                  <label className="admin-ref-form-label">
                    უარყოფის მიზეზი
                  </label>
                  <textarea
                    value={processForm.rejectionReason}
                    onChange={(e) =>
                      setProcessForm({
                        ...processForm,
                        rejectionReason: e.target.value,
                      })
                    }
                    className="admin-ref-form-textarea"
                    rows={3}
                    placeholder="მიუთითეთ უარყოფის მიზეზი"
                    required
                  />
                </div>
              )}

              <div className="admin-ref-flex admin-ref-gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProcessModal(false);
                    setProcessingId(null);
                    setProcessForm({
                      status: "APPROVED",
                      rejectionReason: "",
                      transactionId: "",
                    });
                  }}
                  className="admin-ref-btn admin-ref-btn-secondary admin-ref-flex-1"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={() =>
                    processingId && processWithdrawalRequest(processingId)
                  }
                  className="admin-ref-btn admin-ref-btn-primary admin-ref-flex-1"
                >
                  დამუშავება
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
