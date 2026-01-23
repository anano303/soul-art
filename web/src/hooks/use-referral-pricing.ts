"use client";

import { useState, useEffect, useMemo } from "react";
import Cookies from "js-cookie";
import { Product } from "@/types";

interface Campaign {
  _id: string;
  name: string;
  maxDiscountPercent: number;
  discountSource: string;
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

/**
 * Hook to calculate referral pricing for a product
 * Checks for:
 * 1. sales_ref cookie (user came from referral link)
 * 2. Active campaign with discount settings
 * 3. Product's referralDiscountPercent or campaign override
 */
export function useReferralPricing(product: Product): ReferralPricing {
  const [salesRefCode, setSalesRefCode] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      ? originalPrice - (originalPrice * (product.discountPercentage || 0)) / 100
      : originalPrice;

    // Determine referral discount percent
    let referralDiscountPercent = 0;
    let hasReferralDiscount = false;
    let campaignName: string | undefined;
    let badgeText: string | undefined;

    // Check if campaign applies
    if (campaign) {
      const appliesToReferrals = campaign.appliesTo.includes("influencer_referrals");
      const hasReferralCode = salesRefCode && salesRefCode.startsWith("SM_");
      
      // რეფერალური აქცია: cookie არსებობს და კამპანია აქტიურია
      if (appliesToReferrals && hasReferralCode) {
        // სელერის ნებართვა - პროდუქტზე დაყენებული referralDiscountPercent
        const sellerPermission = product.referralDiscountPercent || 0;
        
        // მხოლოდ იმ პროდუქტებზე ვრცელდება, სადაც სელერს აქვს ნებართვა (> 0)
        if (sellerPermission > 0) {
          // მინიმუმი სელერის ნებართვასა და ადმინის მაქს პროცენტს შორის
          referralDiscountPercent = Math.min(sellerPermission, campaign.maxDiscountPercent);
          hasReferralDiscount = true;
          campaignName = campaign.name;
          badgeText = campaign.badgeTextGe || campaign.badgeText || "სპეც. ფასი";
          
          console.log("[useReferralPricing] Applying referral discount:", {
            refCode: salesRefCode,
            sellerPermission,
            campaignMax: campaign.maxDiscountPercent,
            appliedPercent: referralDiscountPercent
          });
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
  }, [product, salesRefCode, campaign, isLoading]);
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
  campaignMaxDiscount?: number
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

  // Use campaign max if provided, otherwise product's discount
  let referralDiscountPercent = 0;
  if (campaignMaxDiscount && campaignMaxDiscount > 0) {
    referralDiscountPercent = campaignMaxDiscount;
  } else {
    referralDiscountPercent = product.referralDiscountPercent || 0;
  }
  
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
