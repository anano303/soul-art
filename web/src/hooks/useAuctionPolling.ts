"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/axios";

interface BidStatus {
  currentPrice: number;
  endDate: string;
  status: string;
  totalBids: number;
  minimumBidIncrement: number;
  currentWinner: { name: string } | null;
  recentBids: Array<{
    amount: number;
    timestamp: string;
    bidderName: string;
  }>;
  serverTime: string;
}

interface UseAuctionPollingOptions {
  auctionId: string;
  enabled?: boolean;
  intervalMs?: number;
  onBidUpdate?: (data: BidStatus, wasExtended: boolean) => void;
  onAuctionEnd?: () => void;
}

export function useAuctionPolling({
  auctionId,
  enabled = true,
  intervalMs = 2000, // Poll every 2 seconds for active bidding
  onBidUpdate,
  onAuctionEnd,
}: UseAuctionPollingOptions) {
  const [bidStatus, setBidStatus] = useState<BidStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExtended, setIsExtended] = useState(false);
  
  const previousEndDateRef = useRef<string | null>(null);
  const previousTotalBidsRef = useRef<number | null>(null);
  const hasEndedRef = useRef(false);

  const fetchBidStatus = useCallback(async () => {
    if (!auctionId || !enabled) return;

    try {
      const response = await apiClient.get<BidStatus>(
        `/auctions/${auctionId}/bid-status`
      );
      const data = response.data;

      // Check if auction ended
      if (data.status === "ENDED" && !hasEndedRef.current) {
        hasEndedRef.current = true;
        onAuctionEnd?.();
      }

      // Check if time was extended (end date changed after a new bid)
      const wasExtended =
        previousEndDateRef.current !== null &&
        previousTotalBidsRef.current !== null &&
        data.endDate !== previousEndDateRef.current &&
        data.totalBids > previousTotalBidsRef.current;

      if (wasExtended) {
        setIsExtended(true);
        // Auto-clear extension indicator after 3 seconds
        setTimeout(() => setIsExtended(false), 3000);
      }

      // Check if there's a new bid
      const hasNewBid =
        previousTotalBidsRef.current !== null &&
        data.totalBids > previousTotalBidsRef.current;

      if (hasNewBid) {
        onBidUpdate?.(data, wasExtended);
      }

      previousEndDateRef.current = data.endDate;
      previousTotalBidsRef.current = data.totalBids;

      setBidStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch bid status"));
    } finally {
      setIsLoading(false);
    }
  }, [auctionId, enabled, onBidUpdate, onAuctionEnd]);

  // Initial fetch
  useEffect(() => {
    fetchBidStatus();
  }, [fetchBidStatus]);

  // Polling interval
  useEffect(() => {
    if (!enabled || !auctionId) return;

    // Adjust polling frequency based on auction status
    let actualInterval = intervalMs;

    // If auction is about to end (last minute), poll faster
    if (bidStatus) {
      const timeRemaining =
        new Date(bidStatus.endDate).getTime() - new Date().getTime();
      if (timeRemaining <= 60000 && timeRemaining > 0) {
        actualInterval = 1000; // Poll every second in last minute
      } else if (bidStatus.status !== "ACTIVE") {
        actualInterval = 10000; // Poll less frequently if not active
      }
    }

    const intervalId = setInterval(fetchBidStatus, actualInterval);
    return () => clearInterval(intervalId);
  }, [auctionId, enabled, intervalMs, fetchBidStatus, bidStatus]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchBidStatus();
  }, [fetchBidStatus]);

  return {
    bidStatus,
    isLoading,
    error,
    isExtended,
    refresh,
  };
}

export default useAuctionPolling;
