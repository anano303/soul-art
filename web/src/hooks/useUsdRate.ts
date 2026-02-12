"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/axios";

interface UseUsdRateReturn {
  usdRate: number;
  loading: boolean;
  error: string | null;
  updateRate: (newRate: number) => Promise<boolean>;
  refetch: () => Promise<void>;
}

// Default rate if API fails
const DEFAULT_USD_RATE = 2.5;

// Cache the rate to avoid too many API calls
let cachedRate: number | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useUsdRate(): UseUsdRateReturn {
  const [usdRate, setUsdRate] = useState<number>(cachedRate || DEFAULT_USD_RATE);
  const [loading, setLoading] = useState<boolean>(!cachedRate);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = useCallback(async () => {
    // Check cache
    if (cachedRate && Date.now() - cacheTime < CACHE_DURATION) {
      setUsdRate(cachedRate);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get("/settings/usd-rate");
      const rate = response.data.rate || DEFAULT_USD_RATE;
      
      // Update cache
      cachedRate = rate;
      cacheTime = Date.now();
      
      setUsdRate(rate);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch USD rate:", err);
      setError("Failed to fetch USD rate");
      setUsdRate(DEFAULT_USD_RATE);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRate = useCallback(async (newRate: number): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await apiClient.put("/settings/usd-rate", { rate: newRate });
      
      if (response.data.success) {
        // Update cache
        cachedRate = newRate;
        cacheTime = Date.now();
        
        setUsdRate(newRate);
        setError(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update USD rate:", err);
      setError("Failed to update USD rate");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    // Force refetch by clearing cache
    cachedRate = null;
    cacheTime = 0;
    await fetchRate();
  }, [fetchRate]);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  return { usdRate, loading, error, updateRate, refetch };
}

// Helper function to convert GEL to USD
export function gelToUsd(gelAmount: number, rate: number): number {
  return +(gelAmount / rate).toFixed(2);
}

// Helper function to format price with both currencies
export function formatDualCurrency(gelAmount: number, rate: number): string {
  const usdAmount = gelToUsd(gelAmount, rate);
  return `${gelAmount.toFixed(2)} ₾ ($${usdAmount})`;
}
