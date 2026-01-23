"use client";

import { useState, useEffect, useMemo } from "react";
import Cookies from "js-cookie";
import { Product } from "@/types";

interface ReferralPricing {
  hasReferralDiscount: boolean;
  referralDiscountPercent: number;
  referralPrice: number;
  basePrice: number; // Price before referral discount (but after regular discount if any)
  originalPrice: number; // Original price before any discounts
  totalSavings: number;
  salesRefCode: string | null;
}

/**
 * Hook to calculate referral pricing for a product
 * Checks if user came from a sales manager referral link
 * and calculates the special referral discount
 */
export function useReferralPricing(product: Product): ReferralPricing {
  const [salesRefCode, setSalesRefCode] = useState<string | null>(null);

  useEffect(() => {
    // Check for sales_ref cookie
    const refCode = Cookies.get("sales_ref") || null;
    setSalesRefCode(refCode);
  }, []);

  return useMemo(() => {
    const originalPrice = product.price;
    
    // Calculate base price after regular discount (if any)
    const hasRegularDiscount = (() => {
      if (!product.discountPercentage || product.discountPercentage <= 0) {
        return false;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!product.discountStartDate && !product.discountEndDate) {
        return true;
      }
      const startDate = product.discountStartDate
        ? new Date(product.discountStartDate)
        : null;
      const endDate = product.discountEndDate
        ? new Date(product.discountEndDate)
        : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);
      const isAfterStart = !startDate || today >= startDate;
      const isBeforeEnd = !endDate || today <= endDate;
      return isAfterStart && isBeforeEnd;
    })();

    const basePrice = hasRegularDiscount
      ? originalPrice - (originalPrice * (product.discountPercentage || 0)) / 100
      : originalPrice;

    // Check if referral discount is applicable
    // Must have: salesRefCode cookie AND product has referralDiscountPercent > 0
    const referralDiscountPercent = product.referralDiscountPercent || 0;
    const hasReferralDiscount = !!(
      salesRefCode && 
      salesRefCode.startsWith("SM_") && 
      referralDiscountPercent > 0
    );

    // Calculate referral price (additional discount on top of base price)
    const referralDiscountAmount = hasReferralDiscount
      ? (basePrice * referralDiscountPercent) / 100
      : 0;
    const referralPrice = basePrice - referralDiscountAmount;

    // Total savings from original price
    const totalSavings = originalPrice - referralPrice;

    return {
      hasReferralDiscount,
      referralDiscountPercent,
      referralPrice: Math.round(referralPrice * 100) / 100,
      basePrice: Math.round(basePrice * 100) / 100,
      originalPrice,
      totalSavings: Math.round(totalSavings * 100) / 100,
      salesRefCode,
    };
  }, [product, salesRefCode]);
}

/**
 * Calculate referral pricing without hooks (for server-side or cart calculations)
 */
export function calculateReferralPrice(
  product: { 
    price: number; 
    discountPercentage?: number; 
    discountStartDate?: string;
    discountEndDate?: string;
    referralDiscountPercent?: number;
  },
  salesRefCode: string | null
): {
  hasReferralDiscount: boolean;
  referralDiscountPercent: number;
  referralPrice: number;
  basePrice: number;
  originalPrice: number;
  referralDiscountAmount: number;
} {
  const originalPrice = product.price;
  
  // Calculate base price after regular discount
  const hasRegularDiscount = (() => {
    if (!product.discountPercentage || product.discountPercentage <= 0) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!product.discountStartDate && !product.discountEndDate) {
      return true;
    }
    const startDate = product.discountStartDate
      ? new Date(product.discountStartDate)
      : null;
    const endDate = product.discountEndDate
      ? new Date(product.discountEndDate)
      : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);
    const isAfterStart = !startDate || today >= startDate;
    const isBeforeEnd = !endDate || today <= endDate;
    return isAfterStart && isBeforeEnd;
  })();

  const basePrice = hasRegularDiscount
    ? originalPrice - (originalPrice * (product.discountPercentage || 0)) / 100
    : originalPrice;

  const referralDiscountPercent = product.referralDiscountPercent || 0;
  const hasReferralDiscount = !!(
    salesRefCode && 
    salesRefCode.startsWith("SM_") && 
    referralDiscountPercent > 0
  );

  const referralDiscountAmount = hasReferralDiscount
    ? (basePrice * referralDiscountPercent) / 100
    : 0;
  const referralPrice = basePrice - referralDiscountAmount;

  return {
    hasReferralDiscount,
    referralDiscountPercent,
    referralPrice: Math.round(referralPrice * 100) / 100,
    basePrice: Math.round(basePrice * 100) / 100,
    originalPrice,
    referralDiscountAmount: Math.round(referralDiscountAmount * 100) / 100,
  };
}
