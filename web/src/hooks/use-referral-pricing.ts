"use client";

import { useState, useEffect, useMemo } from "react";
import Cookies from "js-cookie";
// import { Product } from "@/types";

interface Campaign {
  _id: string;
  name: string;
  maxDiscountPercent: number;
  onlyProductsWithPermission: boolean;
  appliesTo: string[];
  badgeText?: string;
  badgeTextGe?: string;
}

interface ReferralPricing {
  hasReferralDiscount: boolean;
  referralDiscountPercent: number;
  referralPrice: number;
  basePrice: number;
  originalPrice: number;
  totalSavings: number;
  salesRefCode: string | null;
  campaignName?: string;
  badgeText?: string;
}

// Cache for active campaign
let cachedCampaign: Campaign | null = null;
let campaignFetchPromise: Promise<Campaign | null> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

async function fetchActiveCampaign(): Promise<Campaign | null> {
  const now = Date.now();

  // Return cached if fresh
  if (cachedCampaign !== null && now - lastFetchTime < CACHE_TTL) {
    return cachedCampaign;
  }

  // If already fetching, return that promise
  if (campaignFetchPromise) {
    return campaignFetchPromise;
  }

  campaignFetchPromise = (async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${baseUrl}/campaigns/active`, {
        credentials: "include",
      });

      if (!response.ok) {
        console.warn("[useReferralPricing] Failed to fetch active campaign");
        return null;
      }

      const data = await response.json();
      cachedCampaign = data.campaign || null;
      lastFetchTime = Date.now();
      console.log("[useReferralPricing] Fetched campaign:", cachedCampaign);
      return cachedCampaign;
    } catch (error) {
      console.error("[useReferralPricing] Error fetching campaign:", error);
      return null;
    } finally {
      campaignFetchPromise = null;
    }
  })();

  return campaignFetchPromise;
}

// Minimal product interface for the hook
interface MinimalProduct {
  _id?: string;
  id?: string;
  price: number;
  discountPercentage?: number;
  discountStartDate?: string | Date;
  discountEndDate?: string | Date;
  referralDiscountPercent?: number;
}

/**
 * Hook to calculate referral pricing for a product
 * Checks for:
 * 1. sales_ref cookie (user came from referral link)
 * 2. Active campaign with discount settings
 * 3. Product's referralDiscountPercent or campaign override
 */
export function useReferralPricing(product: MinimalProduct): ReferralPricing {
  const [salesRefCode, setSalesRefCode] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for sales_ref cookie
    const refCode = Cookies.get("sales_ref") || null;
    console.log("[useReferralPricing] sales_ref cookie:", refCode);
    setSalesRefCode(refCode);

    // Always fetch campaign (might be promo for all users)
    fetchActiveCampaign().then((c) => {
      console.log("[useReferralPricing] Active campaign:", c);
      setCampaign(c);
      setIsLoading(false);
    });
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
      ? originalPrice -
        (originalPrice * (product.discountPercentage || 0)) / 100
      : originalPrice;

    // Determine referral discount percent
    let referralDiscountPercent = 0;
    let hasReferralDiscount = false;
    let campaignName: string | undefined;
    let badgeText: string | undefined;

    // Check if campaign applies
    if (campaign) {
      const appliesToAllVisitors = campaign.appliesTo.includes("all_visitors");
      const appliesToReferrals = campaign.appliesTo.includes(
        "influencer_referrals",
      );
      const hasReferralCode = !!(
        salesRefCode && (salesRefCode.startsWith("PROMO") || salesRefCode.startsWith("SM_"))
      );

      // კამპანია ვრცელდება თუ:
      // 1. all_visitors - ყველაზე ვრცელდება (კოდის გარეშეც)
      // 2. influencer_referrals - მხოლოდ PROMO/SM_ cookie-ით მოსულებზე
      const campaignApplies =
        appliesToAllVisitors || (appliesToReferrals && hasReferralCode);

      if (campaignApplies) {
        // სელერის ნებართვა - პროდუქტზე დაყენებული referralDiscountPercent
        const sellerPermission = product.referralDiscountPercent || 0;

        // სელერის ნებართვა სავალდებულოა - თუ 0-ია, ფასდაკლება არ ვრცელდება
        if (sellerPermission <= 0) {
          // პროდუქტს არ აქვს ნებართვა, ფასდაკლება არ ვრცელდება
        } else {
          // ფასდაკლება = min(სელერის ნებართვა, ადმინის მაქსიმუმი)
          const discountPercent = Math.min(
            sellerPermission,
            campaign.maxDiscountPercent,
          );

          if (discountPercent > 0) {
            referralDiscountPercent = discountPercent;
            hasReferralDiscount = true;
            campaignName = campaign.name;
            badgeText =
              campaign.badgeTextGe || campaign.badgeText || "სპეც. ფასი";

            console.log("[useReferralPricing] Applying campaign discount:", {
              refCode: salesRefCode,
              appliesToAllVisitors,
              appliesToReferrals,
              hasReferralCode,
              sellerPermission,
              campaignMax: campaign.maxDiscountPercent,
              appliedPercent: referralDiscountPercent,
            });
          }
        }
      }
    }

    // Calculate referral price
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
      campaignName,
      badgeText,
    };
  }, [product, salesRefCode, campaign]);
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
  salesRefCode: string | null,
  campaignInfo?: {
    maxDiscountPercent: number;
    appliesTo: string[];
    onlyProductsWithPermission?: boolean;
  },
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

  if (!campaignInfo) {
    return {
      hasReferralDiscount: false,
      referralDiscountPercent: 0,
      referralPrice: Math.round(basePrice * 100) / 100,
      basePrice: Math.round(basePrice * 100) / 100,
      originalPrice,
      referralDiscountAmount: 0,
    };
  }

  // Determine if campaign applies to this visitor
  const appliesToAllVisitors = campaignInfo.appliesTo.includes("all_visitors");
  const appliesToReferrals = campaignInfo.appliesTo.includes(
    "influencer_referrals",
  );
  const hasReferralCode = !!(salesRefCode && (salesRefCode.startsWith("PROMO") || salesRefCode.startsWith("SM_")));
  const campaignApplies =
    appliesToAllVisitors || (appliesToReferrals && hasReferralCode);

  let referralDiscountPercent = 0;
  if (campaignApplies) {
    const sellerPermission = product.referralDiscountPercent || 0;

    // სელერის ნებართვა სავალდებულოა - თუ 0-ია, ფასდაკლება არ ვრცელდება
    if (sellerPermission <= 0) {
      // Product doesn't have permission - no discount
    } else {
      // discount = min(seller permission, admin max)
      referralDiscountPercent = Math.min(
        sellerPermission,
        campaignInfo.maxDiscountPercent,
      );
    }
  }

  const hasReferralDiscount = referralDiscountPercent > 0 && campaignApplies;

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
