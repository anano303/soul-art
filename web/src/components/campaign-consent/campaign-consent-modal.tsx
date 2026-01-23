"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import { X } from "lucide-react";
import "./campaign-consent-modal.css";

interface CampaignConsentModalProps {
  userId: string;
  currentChoice?: "all" | "per_product" | "none";
  currentDiscount?: number;
}

const STORAGE_KEY = "campaign_consent_last_shown";
const HOURS_24 = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function CampaignConsentModal({
  userId,
  currentChoice = "none",
  currentDiscount = 10,
}: CampaignConsentModalProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [campaignDiscountChoice, setCampaignDiscountChoice] = useState<
    "all" | "per_product" | "none"
  >(currentChoice);
  const [defaultReferralDiscount, setDefaultReferralDiscount] =
    useState<number>(currentDiscount);
  const [isSaving, setIsSaving] = useState(false);

  // Check if we should show the modal
  useEffect(() => {
    // If user already made a choice (not "none"), don't show
    if (currentChoice !== "none") {
      return;
    }

    // Check localStorage for last shown time
    const storageKey = `${STORAGE_KEY}_${userId}`;
    const lastShown = localStorage.getItem(storageKey);

    if (lastShown) {
      const lastShownTime = parseInt(lastShown, 10);
      const now = Date.now();

      // If less than 24 hours passed, don't show
      if (now - lastShownTime < HOURS_24) {
        return;
      }
    }

    // Show the modal after a short delay
    const timer = setTimeout(() => {
      setIsOpen(true);
      // Update last shown time
      localStorage.setItem(storageKey, Date.now().toString());
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, [userId, currentChoice]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      await apiClient.patch("/users/campaign-settings", {
        campaignDiscountChoice,
        defaultReferralDiscount:
          campaignDiscountChoice === "all" ? defaultReferralDiscount : 0,
      });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: language === "en" ? "Settings saved" : "პარამეტრები შენახულია",
        description:
          language === "en"
            ? "Your campaign preferences have been saved"
            : "აქციის პარამეტრები შენახულია",
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to save campaign settings", error);
      toast({
        title:
          language === "en"
            ? "Failed to save settings"
            : "პარამეტრების შენახვა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    campaignDiscountChoice,
    defaultReferralDiscount,
    language,
    queryClient,
    toast,
  ]);

  const handleRemindLater = useCallback(() => {
    // Just close, will show again after 24 hours
    setIsOpen(false);
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="campaign-modal-overlay" onClick={handleClose}>
      <div
        className="campaign-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-modal-title"
      >
        <button
          type="button"
          className="campaign-modal__close"
          onClick={handleClose}
          aria-label={language === "en" ? "Close" : "დახურვა"}
        >
          <X size={20} />
        </button>

        <div className="campaign-modal__header">
          <h2 id="campaign-modal-title" className="campaign-modal__title">
            {language === "en"
              ? "🎉 Join Our Promotions!"
              : "🎉 შემოგვიერთდი აქციებში!"}
          </h2>
          <p className="campaign-modal__subtitle">
            {language === "en"
              ? "Allow SoulArt to offer special discounts on your products during campaigns and for influencer referrals. This can increase your sales!"
              : "მიეცი SoulArt-ს უფლება აქციებისა და ინფლუენსერების მოწვეული ვიზიტორების დროს სპეციალური ფასდაკლება გააკეთოს შენს ნამუშევრებზე. ეს გაყიდვებს გაგიზრდის!"}
          </p>
        </div>

        <div className="campaign-modal__options">
          <label className="campaign-modal__option">
            <input
              type="radio"
              name="modalCampaignChoice"
              value="all"
              checked={campaignDiscountChoice === "all"}
              onChange={() => setCampaignDiscountChoice("all")}
            />
            <div className="campaign-modal__option-content">
              <span className="campaign-modal__option-title">
                {language === "en"
                  ? "✅ Allow on all products"
                  : "✅ თანხმობა ყველა ნამუშევარზე"}
              </span>
              <span className="campaign-modal__option-desc">
                {language === "en"
                  ? "SoulArt can apply discounts during promotions"
                  : "SoulArt-ს შეუძლია აქციების დროს ფასდაკლება გააკეთოს"}
              </span>
            </div>
          </label>

          <label className="campaign-modal__option">
            <input
              type="radio"
              name="modalCampaignChoice"
              value="per_product"
              checked={campaignDiscountChoice === "per_product"}
              onChange={() => setCampaignDiscountChoice("per_product")}
            />
            <div className="campaign-modal__option-content">
              <span className="campaign-modal__option-title">
                {language === "en"
                  ? "🎯 Choose per product"
                  : "🎯 თითო ნამუშევარზე ცალკე"}
              </span>
              <span className="campaign-modal__option-desc">
                {language === "en"
                  ? "You'll choose which products can have discounts"
                  : "თითოეულ ნამუშევარზე ცალკე აირჩევ"}
              </span>
            </div>
          </label>

          <label className="campaign-modal__option campaign-modal__option--muted">
            <input
              type="radio"
              name="modalCampaignChoice"
              value="none"
              checked={campaignDiscountChoice === "none"}
              onChange={() => setCampaignDiscountChoice("none")}
            />
            <div className="campaign-modal__option-content">
              <span className="campaign-modal__option-title">
                {language === "en"
                  ? "Don't participate"
                  : "არ მინდა მონაწილეობა"}
              </span>
            </div>
          </label>
        </div>

        {campaignDiscountChoice === "all" && (
          <div className="campaign-modal__discount-row">
            <label className="campaign-modal__discount-label">
              {language === "en"
                ? "Max discount %:"
                : "მაქსიმალური ფასდაკლება %:"}
            </label>
            <div className="campaign-modal__discount-input-wrapper">
              <input
                type="number"
                min="1"
                max="50"
                value={defaultReferralDiscount}
                onChange={(e) =>
                  setDefaultReferralDiscount(
                    Math.min(50, Math.max(1, Number(e.target.value)))
                  )
                }
                className="campaign-modal__discount-input"
              />
              <span className="campaign-modal__discount-suffix">%</span>
            </div>
          </div>
        )}

        <div className="campaign-modal__actions">
          <button
            type="button"
            className="campaign-modal__later-btn"
            onClick={handleRemindLater}
          >
            {language === "en" ? "Remind me later" : "მოგვიანებით შემახსენე"}
          </button>
          <button
            type="button"
            className="campaign-modal__save-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving
              ? language === "en"
                ? "Saving..."
                : "შენახვა..."
              : language === "en"
              ? "Save"
              : "შენახვა"}
          </button>
        </div>
      </div>
    </div>
  );
}
