"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingWithdrawals,
  BalanceTransaction,
  approveWithdrawal,
  rejectWithdrawal,
} from "../api/balance-api";
import { Bell, DollarSign, Clock, User, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import "./pending-withdrawals-widget.css";

interface PendingWithdrawalsWidgetProps {
  className?: string;
}

export function PendingWithdrawalsWidget({
  className,
}: PendingWithdrawalsWidgetProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ["pending-withdrawals"],
    queryFn: getPendingWithdrawals,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: (transactionId: string) => approveWithdrawal(transactionId),
    onSuccess: (data) => {
      toast({
        title: "წარმატება",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "შეცდომა",
        description: error.message || "თანხის დადასტურება ვერ მოხერხდა",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      transactionId,
      reason,
    }: {
      transactionId: string;
      reason?: string;
    }) => rejectWithdrawal(transactionId, reason),
    onSuccess: (data) => {
      toast({
        title: "წარმატება",
        description: data.message,
      });
      setRejectingId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "შეცდომა",
        description: error.message || "თანხის უარყოფა ვერ მოხერხდა",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (transactionId: string) => {
    if (
      confirm("დარწმუნებული ხართ, რომ გსურთ ამ თანხის გატანის დადასტურება?")
    ) {
      approveMutation.mutate(transactionId);
    }
  };

  const handleReject = (transactionId: string) => {
    rejectMutation.mutate({ transactionId, reason: rejectReason });
  };

  if (isLoading) {
    return (
      <div className={`pending-withdrawals-widget ${className || ""}`}>
        <div className="widget-header">
          <Bell className="widget-icon" />
          <span>მოთხოვნები იტვირთება...</span>
        </div>
      </div>
    );
  }

  const pendingCount = pendingData?.count || 0;
  const requests = pendingData?.requests || [];

  return (
    <div className={`pending-withdrawals-widget ${className || ""}`}>
      <div className="widget-header">
        <Bell className="widget-icon" />
        <span>თანხის გატანის მოთხოვნები</span>
        {pendingCount > 0 && (
          <span className="notification-badge">{pendingCount}</span>
        )}
      </div>

      {pendingCount === 0 ? (
        <div className="no-requests">
          <Clock className="empty-icon" />
          <p>ახალი მოთხოვნები არ არის</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.slice(0, 5).map((request: BalanceTransaction) => (
            <div key={request._id} className="request-item">
              <div className="request-info">
                <div className="seller-info">
                  <User className="seller-icon" />
                  <span className="seller-name">
                    {typeof request.seller === "object" && request.seller
                      ? request.seller.storeName ||
                        `${request.seller.ownerFirstName || ""} ${
                          request.seller.ownerLastName || ""
                        }`.trim() ||
                        request.seller.name ||
                        "უცნობი სელერი"
                      : "უცნობი სელერი"}
                  </span>
                </div>
                <div className="request-details">
                  <div className="amount">
                    <DollarSign className="amount-icon" />
                    <span>{Math.abs(request.amount).toFixed(2)} ₾</span>
                  </div>
                  <div className="date">
                    {new Date(request.createdAt).toLocaleDateString("ka-GE")}{" "}
                    {new Date(request.createdAt).toLocaleTimeString("ka-GE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="request-actions">
                {rejectingId === request._id ? (
                  <div className="reject-form">
                    <input
                      type="text"
                      placeholder="უარყოფის მიზეზი (არასავალდებულო)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="reject-reason-input"
                    />
                    <div className="reject-form-actions">
                      <button
                        onClick={() => handleReject(request._id)}
                        disabled={rejectMutation.isPending}
                        className="confirm-reject-btn"
                      >
                        {rejectMutation.isPending ? "..." : "უარყოფა"}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                        className="cancel-reject-btn"
                      >
                        გაუქმება
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="action-buttons">
                    <button
                      onClick={() => handleApprove(request._id)}
                      disabled={approveMutation.isPending}
                      className="approve-btn"
                    >
                      <Check className="action-icon" />
                      {approveMutation.isPending ? "..." : "დადასტურება"}
                    </button>
                    <button
                      onClick={() => setRejectingId(request._id)}
                      className="reject-btn"
                    >
                      <X className="action-icon" />
                      უარყოფა
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {pendingCount > 5 && (
            <div className="more-requests">
              კიდევ {pendingCount - 5} მოთხოვნა...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
