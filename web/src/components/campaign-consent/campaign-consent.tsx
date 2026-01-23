"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import { Eye, Pencil } from "lucide-react";
import "./campaign-consent.css";

interface CampaignConsentProps {
  initialChoice?: "all" | "per_product" | "none";
  initialDiscount?: number;
  onSaved?: () => void;
}

export function CampaignConsent({
  initialChoice = "none",
  initialDiscount = 10,
  onSaved,
}: CampaignConsentProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [campaignDiscountChoice, setCampaignDiscountChoice] = useState<
    "all" | "per_product" | "none"
  >(initialChoice);
  const [defaultReferralDiscount, setDefaultReferralDiscount] =
    useState<number>(initialDiscount);
  const [isSaving, setIsSaving] = useState(false);
  // Start collapsed if user already has a saved choice (not 'none' or if explicitly set)
  const [isExpanded, setIsExpanded] = useState(initialChoice === "none");

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
      });
      setIsExpanded(false); // Collapse after save
      onSaved?.();
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
    onSaved,
  ]);

  // Generate collapsed summary text
  const getCollapsedText = () => {
    if (campaignDiscountChoice === "none") {
      return language === "en"
        ? "You haven't allowed campaign discounts"
        : "შენ არ აძლევ უფლებას აქციებში მონაწილეობის";
    }
    if (campaignDiscountChoice === "all") {
      return language === "en"
        ? `You allow SoulArt to discount all products up to ${defaultReferralDiscount}%`
        : `შენ აძლევ უფლებას SoulArt-ს ყველა ნამუშევარზე მაქს. ${defaultReferralDiscount}%-ით ფასდაკლება გააკეთოს`;
    }
    // per_product
    return language === "en"
      ? "You choose discounts per product"
      : "შენ ირჩევ ფასდაკლებას თითოეულ ნამუშევარზე ცალკე";
  };

  // Collapsed view
  if (!isExpanded) {
    return (
      <div className="campaign-consent campaign-consent--collapsed">
        <div className="campaign-consent__collapsed-content">
          <div className="campaign-consent__visibility">
            <Eye size={14} />
            <span>
              {language === "en"
                ? "Only you can see this"
                : "ხედავთ მხოლოდ თქვენ"}
            </span>
          </div>
          <p className="campaign-consent__summary">{getCollapsedText()}</p>
        </div>
        <button
          type="button"
          className="campaign-consent__edit-btn"
          onClick={() => setIsExpanded(true)}
          aria-label={language === "en" ? "Edit" : "რედაქტირება"}
        >
          <Pencil size={16} />
          <span>{language === "en" ? "Edit" : "რედაქტირება"}</span>
        </button>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="campaign-consent">
      <div className="campaign-consent__visibility">
        <Eye size={14} />
        <span>
          {language === "en" ? "Only you can see this" : "ხედავთ მხოლოდ თქვენ"}
        </span>
      </div>

      <div className="campaign-consent__header">
        <h3 className="campaign-consent__title">
          {language === "en"
            ? "Promotions & Influencer Discounts"
            : "აქციები და ინფლუენსერის ფასდაკლებები"}
        </h3>
        <p className="campaign-consent__subtitle">
          {language === "en"
            ? "These discounts apply during campaigns and for visitors referred by influencers. They also apply on top of your existing product discounts."
            : "ეს ფასდაკლებები ვრცელდება აქციების დროს და ინფლუენსერების მოწვეული ვიზიტორებისთვის. ასევე ვრცელდება შენს უკვე ფასდაკლებულ პროდუქტებზეც."}
        </p>
      </div>

      <div className="campaign-consent__options">
        <label className="campaign-consent__option">
          <input
            type="radio"
            name="campaignChoice"
            value="none"
            checked={campaignDiscountChoice === "none"}
            onChange={() => setCampaignDiscountChoice("none")}
          />
          <div className="campaign-consent__option-content">
            <span className="campaign-consent__option-title">
              {language === "en" ? "Don't participate" : "არ მივცე თანხმობა"}
            </span>
            <span className="campaign-consent__option-desc">
              {language === "en"
                ? "Your products won't have additional discounts"
                : "შენს ნამუშევრებზე დამატებითი ფასდაკლება არ იქნება"}
            </span>
          </div>
        </label>

        <label className="campaign-consent__option">
          <input
            type="radio"
            name="campaignChoice"
            value="all"
            checked={campaignDiscountChoice === "all"}
            onChange={() => setCampaignDiscountChoice("all")}
          />
          <div className="campaign-consent__option-content">
            <span className="campaign-consent__option-title">
              {language === "en"
                ? "Allow on all products"
                : "ვაძლევ თანხმობას ყველა ნამუშევარზე"}
            </span>
            <span className="campaign-consent__option-desc">
              {language === "en"
                ? "SoulArt can apply discounts to all your products during promotions"
                : "SoulArt-ს შეუძლია აქციების/ინფლუენსერების დროს ფასდაკლება გაუკეთოს ყველა ნამუშევარს"}
            </span>
          </div>
        </label>

        <label className="campaign-consent__option">
          <input
            type="radio"
            name="campaignChoice"
            value="per_product"
            checked={campaignDiscountChoice === "per_product"}
            onChange={() => setCampaignDiscountChoice("per_product")}
          />
          <div className="campaign-consent__option-content">
            <span className="campaign-consent__option-title">
              {language === "en"
                ? "Choose per product"
                : "ავირჩევ თითოეულ ნამუშევარზე ცალკე"}
            </span>
            <span className="campaign-consent__option-desc">
              {language === "en"
                ? "When adding products, you'll choose which ones can have discounts"
                : "ნამუშევრის დამატებისას აირჩევ რომელზე გავრცელდეს ფასდაკლება"}
            </span>
          </div>
        </label>
      </div>

      {campaignDiscountChoice === "all" && (
        <div className="campaign-consent__discount-row">
          <label className="campaign-consent__discount-label">
            {language === "en"
              ? "Enter max % that SoulArt can discount:"
              : "შეიყვანე მაქსიმალური % რამდენი შეუძლია დააკლოს SoulArt-ს:"}
          </label>
          <div className="campaign-consent__discount-input-wrapper">
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
              className="campaign-consent__discount-input"
            />
            <span className="campaign-consent__discount-suffix">%</span>
          </div>
        </div>
      )}

      <div className="campaign-consent__actions">
        <button
          type="button"
          className="campaign-consent__cancel-btn"
          onClick={() => {
            // Reset to initial values and collapse
            setCampaignDiscountChoice(initialChoice);
            setDefaultReferralDiscount(initialDiscount);
            setIsExpanded(false);
          }}
        >
          {language === "en" ? "Cancel" : "გაუქმება"}
        </button>
        <button
          type="button"
          className="campaign-consent__save-btn"
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
  );
}
