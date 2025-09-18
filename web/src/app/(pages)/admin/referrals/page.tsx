"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
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

interface AdminReferralItem {
  id: string;
  referrer: { name: string; email: string };
  referred: { name: string; email: string; role: string; createdAt: string };
  type: string;
  status: string;
  bonusAmount: number;
  createdAt: string;
}

export default function AdminReferralsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [withdrawalRequests, setWithdrawalRequests] = useState<
    WithdrawalRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [referrals, setReferrals] = useState<AdminReferralItem[]>([]);
  const [approvingSellerId, setApprovingSellerId] = useState<string | null>(
    null
  );
  const [processForm, setProcessForm] = useState({
    status: "APPROVED" as "APPROVED" | "REJECTED",
    rejectionReason: "",
    transactionId: "",
  });

  const fetchWithdrawals = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(
        selectedStatus
          ? `${process.env.NEXT_PUBLIC_API_URL}/referrals/admin/withdrawal/requests?status=${selectedStatus}`
          : `${process.env.NEXT_PUBLIC_API_URL}/referrals/admin/withdrawal/requests`,
        {
          credentials: "include", // Use HTTP-only cookies
        }
      );

      if (response.ok) {
        const data = await response.json();
        setWithdrawalRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch withdrawal requests:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, user]);

  const fetchReferrals = useCallback(async () => {
    try {
      const url = selectedStatus
        ? `${process.env.NEXT_PUBLIC_API_URL}/referrals/admin/referrals?status=${selectedStatus}`
        : `${process.env.NEXT_PUBLIC_API_URL}/referrals/admin/referrals`;
      const response = await fetch(url, {
        credentials: "include", // Use HTTP-only cookies
      });
      if (response.ok) {
        const data = await response.json();
        setReferrals(data);
      }
    } catch (e) {
      console.error("Failed to fetch referrals", e);
    }
  }, [selectedStatus]);

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchWithdrawals();
      fetchReferrals();
    }
  }, [user, fetchWithdrawals, fetchReferrals]);

  const processWithdrawalRequest = async (requestId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/admin/withdrawal/${requestId}`,
        {
          method: "PATCH",
          credentials: "include", // Use HTTP-only cookies
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processForm),
        }
      );

      if (response.ok) {
        toast.success(t("adminReferrals.processSuccess"));
        setShowProcessModal(false);
        setProcessingId(null);
        setProcessForm({
          status: "APPROVED",
          rejectionReason: "",
          transactionId: "",
        });
        fetchWithdrawals();
      } else {
        const error = await response.json();
        toast.error(error.message || t("adminReferrals.processFailed"));
      }
    } catch {
      toast.error(t("adminReferrals.errorOccurred"));
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
        return t("adminReferrals.pending");
      case "PROCESSED":
        return t("adminReferrals.processed");
      case "REJECTED":
        return t("adminReferrals.rejected");
      default:
        return status;
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="admin-referrals-page">
        <div className="admin-ref-container admin-ref-py-8">
          <p className="admin-ref-text-red-600 admin-ref-text-xl admin-ref-font-semibold">
            {t("adminReferrals.noAccess")}
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
            {t("adminReferrals.title")}
          </h1>

          <div className="admin-ref-flex admin-ref-items-center admin-ref-gap-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="admin-ref-form-select"
            >
              <option value="">{t("adminReferrals.allStatuses")}</option>
              <option value="PENDING">{t("adminReferrals.pending")}</option>
              <option value="PRODUCTS_UPLOADED">
                {t("adminReferrals.productsUploaded")}
              </option>
              <option value="APPROVED">{t("adminReferrals.approved")}</option>
              <option value="REJECTED">{t("adminReferrals.rejected")}</option>
            </select>
          </div>
        </div>

        {/* რეფერალები */}
        <div className="admin-ref-card admin-ref-mb-8">
          <div className="admin-ref-p-6 admin-ref-border-b">
            <h3 className="admin-ref-text-xl admin-ref-font-semibold admin-ref-text-gray-900">
              {t("adminReferrals.referralsTitle")}
            </h3>
          </div>
          <div className="admin-ref-table-container">
            <table className="admin-ref-table">
              <thead>
                <tr>
                  <th>{t("adminReferrals.invitedBy")}</th>
                  <th>{t("adminReferrals.invited")}</th>
                  <th>{t("adminReferrals.type")}</th>
                  <th>{t("adminReferrals.status")}</th>
                  <th>{t("adminReferrals.bonus")}</th>
                  <th>{t("adminReferrals.date")}</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="admin-ref-user-name">
                        {r.referrer?.name}
                      </div>
                      <div className="admin-ref-user-email">
                        {r.referrer?.email}
                      </div>
                    </td>
                    <td>
                      <div className="admin-ref-user-name">
                        {r.referred?.name}
                      </div>
                      <div className="admin-ref-user-email">
                        {r.referred?.email}
                      </div>
                    </td>
                    <td>
                      {r.type === "SELLER"
                        ? t("adminReferrals.seller")
                        : t("adminReferrals.user")}
                    </td>
                    <td>{r.status}</td>
                    <td>{r.bonusAmount.toFixed(2)} ₾</td>
                    <td className="admin-ref-text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString("ka-GE")}
                    </td>
                    <td>
                      {r.type === "SELLER" &&
                        (r.status === "PENDING" ||
                          r.status === "PRODUCTS_UPLOADED") && (
                          <button
                            disabled={
                              approvingSellerId ===
                              (r.referred as unknown as { id?: string }).id
                            }
                            onClick={async () => {
                              const referredObj = r.referred as unknown as {
                                id?: string;
                                _id?: string;
                              };
                              const sellerId =
                                referredObj.id || referredObj._id;
                              if (!sellerId) return;
                              setApprovingSellerId(sellerId);

                              try {
                                const res = await fetch(
                                  `${process.env.NEXT_PUBLIC_API_URL}/referrals/admin/approve-seller`,
                                  {
                                    method: "POST",
                                    credentials: "include", // Use HTTP-only cookies
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ sellerId }),
                                  }
                                );
                                if (res.ok) {
                                  toast.success(
                                    t("adminReferrals.sellerApproved")
                                  );
                                  fetchReferrals();
                                } else {
                                  const err = await res.json();
                                  toast.error(
                                    err.message ||
                                      t("adminReferrals.approvalFailed")
                                  );
                                }
                              } catch {
                                toast.error(t("adminReferrals.errorOccurred"));
                              } finally {
                                setApprovingSellerId(null);
                              }
                            }}
                            className="admin-ref-btn admin-ref-btn-primary"
                          >
                            {approvingSellerId ===
                            (r.referred as unknown as { id?: string }).id
                              ? t("adminReferrals.approving")
                              : t("adminReferrals.approveSeller")}
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* გატანის მოთხოვნები */}
        <div className="admin-ref-card">
          <div className="admin-ref-p-6 admin-ref-border-b">
            <h3 className="admin-ref-text-xl admin-ref-font-semibold admin-ref-text-gray-900">
              {t("adminReferrals.withdrawalRequestsTitle")}
            </h3>
          </div>
          <div className="admin-ref-table-container">
            <table className="admin-ref-table">
              <thead>
                <tr>
                  <th>{t("adminReferrals.customer")}</th>
                  <th>{t("adminReferrals.amount")}</th>
                  <th>{t("adminReferrals.method")}</th>
                  <th>{t("adminReferrals.accountDetails")}</th>
                  <th>{t("adminReferrals.status")}</th>
                  <th>{t("adminReferrals.date")}</th>
                  <th>{t("adminReferrals.action")}</th>
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
                        {request.amount.toFixed(2)} {t("adminReferrals.lari")}
                      </span>
                    </td>
                    <td className="admin-ref-text-gray-900">
                      {request.method === "BANK"
                        ? t("adminReferrals.bank")
                        : t("adminReferrals.paybox")}
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
                          {t("adminReferrals.process")}
                        </button>
                      )}
                      {request.status === "PROCESSED" &&
                        request.processedBy && (
                          <div className="admin-ref-processed-info">
                            <div className="admin-ref-font-medium">
                              {t("adminReferrals.processedBy")}
                            </div>
                            <div className="admin-ref-text-sm">
                              {request.processedBy.name}
                            </div>
                          </div>
                        )}
                      {request.status === "REJECTED" && (
                        <div className="admin-ref-rejected-info">
                          <div className="admin-ref-font-medium">
                            {t("adminReferrals.rejected")}
                          </div>
                          {request.rejectionReason && (
                            <div className="admin-ref-rejection-reason">
                              {t("adminReferrals.rejectedReason")}:{" "}
                              {request.rejectionReason}
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
                {t("adminReferrals.processRequestTitle")}
              </h3>

              <div className="admin-ref-mb-4">
                <label className="admin-ref-form-label">
                  {t("adminReferrals.status")}
                </label>
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
                  <option value="APPROVED">
                    {t("adminReferrals.approve")}
                  </option>
                  <option value="REJECTED">{t("adminReferrals.reject")}</option>
                </select>
              </div>

              {processForm.status === "APPROVED" && (
                <div className="admin-ref-mb-4">
                  <label className="admin-ref-form-label">
                    {t("adminReferrals.transactionId")}
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
                    placeholder={t("adminReferrals.transactionIdPlaceholder")}
                  />
                </div>
              )}

              {processForm.status === "REJECTED" && (
                <div className="admin-ref-mb-4">
                  <label className="admin-ref-form-label">
                    {t("adminReferrals.rejectionReason")}
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
                    placeholder={t("adminReferrals.rejectionReasonPlaceholder")}
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
                  {t("adminReferrals.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    processingId && processWithdrawalRequest(processingId)
                  }
                  className="admin-ref-btn admin-ref-btn-primary admin-ref-flex-1"
                >
                  {t("adminReferrals.process")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
