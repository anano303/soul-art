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
  hasUpdate?: boolean;
}

interface UseAuctionPollingOptions {
  auctionId: string;
  enabled?: boolean;
  onBidUpdate?: (data: BidStatus, wasExtended: boolean) => void;
  onAuctionEnd?: () => void;
}

export function useAuctionPolling({
  auctionId,
  enabled = true,
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
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Use refs for callbacks to avoid recreating the fetch function
  const onBidUpdateRef = useRef(onBidUpdate);
  const onAuctionEndRef = useRef(onAuctionEnd);
  
  useEffect(() => {
    onBidUpdateRef.current = onBidUpdate;
  }, [onBidUpdate]);
  
  useEffect(() => {
    onAuctionEndRef.current = onAuctionEnd;
  }, [onAuctionEnd]);

  const processResponse = useCallback((data: BidStatus) => {
    // Check if auction ended
    if (data.status === "ENDED" && !hasEndedRef.current) {
      hasEndedRef.current = true;
      onAuctionEndRef.current?.();
    }

    // Check if time was extended (end date changed after a new bid)
    const wasExtended =
      previousEndDateRef.current !== null &&
      previousTotalBidsRef.current !== null &&
      data.endDate !== previousEndDateRef.current &&
      data.totalBids > previousTotalBidsRef.current;

    if (wasExtended) {
      setIsExtended(true);
      setTimeout(() => setIsExtended(false), 3000);
    }

    // Check if there's a new bid
    const hasNewBid =
      previousTotalBidsRef.current !== null &&
      data.totalBids > previousTotalBidsRef.current;

    if (hasNewBid) {
      onBidUpdateRef.current?.(data, wasExtended);
    }

    previousEndDateRef.current = data.endDate;
    previousTotalBidsRef.current = data.totalBids;

    setBidStatus(data);
    setError(null);
  }, []);

  // Initial fetch (non-blocking)
  const fetchInitialStatus = useCallback(async () => {
    if (!auctionId || !enabled) return;

    try {
      const response = await apiClient.get<BidStatus>(
        `/auctions/${auctionId}/bid-status`
      );
      processResponse(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch bid status"));
    } finally {
      setIsLoading(false);
    }
  }, [auctionId, enabled, processResponse]);

  // Long-polling fetch
  const longPoll = useCallback(async () => {
    if (!auctionId || !enabled || isFetchingRef.current || hasEndedRef.current) return;
    
    isFetchingRef.current = true;
    
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams();
      if (previousTotalBidsRef.current !== null) {
        params.set('lastTotalBids', previousTotalBidsRef.current.toString());
      }
      if (previousEndDateRef.current) {
        params.set('lastEndDate', previousEndDateRef.current);
      }
      params.set('timeout', '25000'); // 25 second server timeout

      const response = await apiClient.get<BidStatus>(
        `/auctions/${auctionId}/bid-status/poll?${params.toString()}`,
        { signal: abortControllerRef.current.signal }
      );
      
      processResponse(response.data);
    } catch (err: unknown) {
      // Don't set error for abort
      if (err instanceof Error && err.name !== 'AbortError' && err.name !== 'CanceledError') {
        setError(err);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [auctionId, enabled, processResponse]);

  // Initial fetch
  useEffect(() => {
    fetchInitialStatus();
  }, [fetchInitialStatus]);

  // Long-polling loop
  useEffect(() => {
    if (!enabled || !auctionId || hasEndedRef.current) return;

    let isMounted = true;
    
    const startPolling = async () => {
      // Wait for initial fetch to complete
      while (isLoading && isMounted) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Long-polling loop
      while (isMounted && !hasEndedRef.current) {
        await longPoll();
        // Small delay between polls to prevent hammering on errors
        if (isMounted && !hasEndedRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };
    
    startPolling();
    
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [auctionId, enabled, isLoading, longPoll]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchInitialStatus();
  }, [fetchInitialStatus]);

  return {
    bidStatus,
    isLoading,
    error,
    isExtended,
    refresh,
  };
}

export default useAuctionPolling;
