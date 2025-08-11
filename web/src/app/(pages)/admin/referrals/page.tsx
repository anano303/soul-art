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
        return "text-green-600 bg-green-100";
      case "PENDING":
        return "text-yellow-600 bg-yellow-100";
      case "REJECTED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
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
      <div className="container mx-auto px-4 py-8">
        <p>უფლება არ გაქვთ ამ გვერდის ნახვისა</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">რეფერალების მართვა</h1>

        <div className="flex items-center gap-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">ყველა მოთხოვნა</option>
            <option value="PENDING">მოლოდინში</option>
            <option value="PROCESSED">დამუშავებული</option>
            <option value="REJECTED">უარყოფილი</option>
          </select>
        </div>
      </div>

      {/* გატანის მოთხოვნები */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">ბალანსის გატანის მოთხოვნები</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  მომხმარებელი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  თანხა
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  მეთოდი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ანგარიშის დეტალები
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  სტატუსი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  თარიღი
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  მოქმედება
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {withdrawalRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{request.user.name}</div>
                      <div className="text-sm text-gray-500">
                        {request.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {request.amount.toFixed(2)} ლარი
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {request.method === "BANK" ? "ბანკი" : "პეიბოქსი"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                    {request.accountDetails}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusText(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString("ka-GE")}
                  </td>
                  <td className="px-6 py-4">
                    {request.status === "PENDING" && (
                      <button
                        onClick={() => openProcessModal(request.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        დამუშავება
                      </button>
                    )}
                    {request.status === "PROCESSED" && request.processedBy && (
                      <div className="text-sm text-green-600">
                        დამუშავდა: {request.processedBy.name}
                      </div>
                    )}
                    {request.status === "REJECTED" && (
                      <div className="text-sm text-red-600">
                        უარყოფილი
                        {request.rejectionReason && (
                          <div className="text-xs text-gray-500 mt-1">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">მოთხოვნის დამუშავება</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                სტატუსი
              </label>
              <select
                value={processForm.status}
                onChange={(e) =>
                  setProcessForm({
                    ...processForm,
                    status: e.target.value as "APPROVED" | "REJECTED",
                  })
                }
                className="w-full p-3 border rounded-lg"
              >
                <option value="APPROVED">დამტკიცება</option>
                <option value="REJECTED">უარყოფა</option>
              </select>
            </div>

            {processForm.status === "APPROVED" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full p-3 border rounded-lg"
                  placeholder="ბანკის ტრანზაქციის ID"
                />
              </div>
            )}

            {processForm.status === "REJECTED" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                  placeholder="მიუთითეთ უარყოფის მიზეზი"
                  required
                />
              </div>
            )}

            <div className="flex gap-4">
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                გაუქმება
              </button>
              <button
                type="button"
                onClick={() =>
                  processingId && processWithdrawalRequest(processingId)
                }
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                დამუშავება
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
