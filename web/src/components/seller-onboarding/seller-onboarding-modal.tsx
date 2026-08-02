"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import "./seller-onboarding-modal.css";

const STORAGE_KEY = "seller_onboarding_last_shown";
const HOURS_24 = 24 * 60 * 60 * 1000;

interface SellerOnboardingModalProps {
  userId: string;
  currentSellerType?: string | null;
  currentOpenForCommissions?: boolean;
  currentSocials?: Record<string, string> | null;
}

/**
 * Asks sellers who registered before these fields existed to fill them in:
 * what they make, whether they take custom orders and their social links.
 * Writes to the very same fields the profile and artist page use.
 */
export function SellerOnboardingModal({
  userId,
  currentSellerType,
  currentOpenForCommissions,
  currentSocials,
}: SellerOnboardingModalProps) {
  const { language } = useLanguage();
  const en = language === "en";
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [sellerType, setSellerType] = useState<"artist" | "handmade" | "both">(
    (currentSellerType as "artist" | "handmade" | "both") || "artist"
  );
  const [openForCommissions, setOpenForCommissions] = useState(
    !!currentOpenForCommissions
  );
  const [facebook, setFacebook] = useState(currentSocials?.facebook || "");
  const [instagram, setInstagram] = useState(currentSocials?.instagram || "");
  const [tiktok, setTiktok] = useState(currentSocials?.tiktok || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Already answered → nothing to ask.
    if (currentSellerType) return;

    const storageKey = `${STORAGE_KEY}_${userId}`;
    const lastShown = localStorage.getItem(storageKey);
    if (lastShown && Date.now() - parseInt(lastShown, 10) < HOURS_24) {
      return;
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
      localStorage.setItem(storageKey, Date.now().toString());
    }, 2000);

    return () => clearTimeout(timer);
  }, [userId, currentSellerType]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await apiClient.patch("/artists/profile", {
        sellerType,
        artistOpenForCommissions: openForCommissions,
        artistSocials: {
          facebook: facebook.trim(),
          instagram: instagram.trim(),
          tiktok: tiktok.trim(),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({
        title: en ? "Thank you!" : "მადლობა!",
        description: en
          ? "Your profile info has been saved."
          : "ინფორმაცია შენახულია.",
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: en ? "Could not save" : "ვერ შეინახა",
        description: error instanceof Error ? error.message : "",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    sellerType,
    openForCommissions,
    facebook,
    instagram,
    tiktok,
    queryClient,
    en,
  ]);

  if (!isOpen) return null;

  return (
    <div className="sob-overlay" role="dialog" aria-modal="true">
      <div className="sob-modal">
        <button
          type="button"
          className="sob-close"
          aria-label={en ? "Close" : "დახურვა"}
          onClick={() => setIsOpen(false)}
        >
          <X size={18} />
        </button>

        <h2 className="sob-title">
          {en ? "Complete your seller profile" : "შეავსე პროფილის ინფორმაცია"}
        </h2>
        <p className="sob-subtitle">
          {en
            ? "Two quick questions — they help buyers find and reach you."
            : "ორი მოკლე კითხვა — დაეხმარება მყიდველებს გიპოვონ და დაგიკავშირდნენ."}
        </p>

        <div className="sob-field">
          <label htmlFor="sob-type">
            {en ? "What do you make?" : "რას ქმნი?"}
          </label>
          <select
            id="sob-type"
            value={sellerType}
            onChange={(e) =>
              setSellerType(e.target.value as "artist" | "handmade" | "both")
            }
          >
            <option value="artist">
              {en ? "Artist (paintings)" : "მხატვარი (ნახატები)"}
            </option>
            <option value="handmade">
              {en ? "Handmade goods" : "ხელნაკეთი ნივთები"}
            </option>
            <option value="both">{en ? "Both" : "ორივე"}</option>
          </select>
        </div>

        <label className="sob-checkbox">
          <input
            type="checkbox"
            checked={openForCommissions}
            onChange={(e) => setOpenForCommissions(e.target.checked)}
          />
          <span>
            🎨{" "}
            {en
              ? "I accept individual (custom) orders"
              : "ვიღებ ინდივიდუალურ შეკვეთებს"}
          </span>
        </label>

        <div className="sob-field">
          <label>{en ? "Social links" : "სოციალური ბმულები"}</label>
          <span className="sob-hint">
            {en
              ? "Optional — fill in whichever you have."
              : "არასავალდებულო — შეავსე რომელიც გაქვს."}
          </span>
          <input
            type="text"
            placeholder="facebook.com/myartpage"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
          />
          <input
            type="text"
            placeholder="instagram.com/myartpage"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
          <input
            type="text"
            placeholder="tiktok.com/@myartpage"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
          />
        </div>

        <div className="sob-actions">
          <button
            type="button"
            className="sob-later"
            onClick={() => setIsOpen(false)}
          >
            {en ? "Later" : "მოგვიანებით"}
          </button>
          <button
            type="button"
            className="sob-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (en ? "Saving…" : "ინახება…") : en ? "Save" : "შენახვა"}
          </button>
        </div>
      </div>
    </div>
  );
}
