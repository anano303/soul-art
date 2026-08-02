"use client";

import { useState } from "react";
import { apiClient } from "@/lib/axios";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import "./seller-public-settings.css";

export const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/username" },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "instagram.com/username",
  },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@username" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@channel" },
  { key: "pinterest", label: "Pinterest", placeholder: "pinterest.com/user" },
  { key: "behance", label: "Behance", placeholder: "behance.net/username" },
  { key: "website", label: "Website", placeholder: "example.com" },
] as const;

export type SocialKey = (typeof SOCIAL_FIELDS)[number]["key"];
export type SocialLinks = Partial<Record<SocialKey, string>>;
export type SellerType = "artist" | "handmade" | "both";

export const SELLER_TYPE_OPTIONS: Array<{
  value: SellerType;
  ge: string;
  en: string;
}> = [
  { value: "artist", ge: "მხატვარი (ნახატები)", en: "Artist (paintings)" },
  { value: "handmade", ge: "ხელნაკეთი ნივთები", en: "Handmade goods" },
  { value: "both", ge: "ორივე", en: "Both" },
];

interface SellerPublicSettingsProps {
  sellerType?: string | null;
  openForCommissions?: boolean;
  socials?: SocialLinks | null;
  /** Called after a successful save with the values that were sent. */
  onSaved?: (values: {
    sellerType: SellerType;
    artistOpenForCommissions: boolean;
    artistSocials: SocialLinks;
  }) => void;
}

/**
 * Seller-facing card: what they make, whether they take custom orders and
 * every social link — the same fields the artist page and the admin editor
 * write to (`sellerType`, `artistOpenForCommissions`, `artistSocials`).
 */
export function SellerPublicSettings({
  sellerType,
  openForCommissions,
  socials,
  onSaved,
}: SellerPublicSettingsProps) {
  const { language } = useLanguage();
  const en = language === "en";

  const [type, setType] = useState<SellerType>(
    (sellerType as SellerType) || "artist"
  );
  const [commissions, setCommissions] = useState(!!openForCommissions);
  const [links, setLinks] = useState<SocialLinks>(() => {
    const initial: SocialLinks = {};
    SOCIAL_FIELDS.forEach(({ key }) => {
      initial[key] = socials?.[key] || "";
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const artistSocials: SocialLinks = {};
      SOCIAL_FIELDS.forEach(({ key }) => {
        artistSocials[key] = (links[key] || "").trim();
      });

      await apiClient.patch("/artists/profile", {
        sellerType: type,
        artistOpenForCommissions: commissions,
        artistSocials,
      });

      toast({ title: en ? "Saved" : "შენახულია" });
      onSaved?.({
        sellerType: type,
        artistOpenForCommissions: commissions,
        artistSocials,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : en ? "Error" : "შეცდომა";
      toast({
        title: en ? "Could not save" : "ვერ შეინახა",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sps-card">
      <h3 className="sps-title">
        {en ? "Public seller info" : "საჯარო ინფორმაცია"}
      </h3>

      <div className="sps-row">
        <label htmlFor="sps-type">{en ? "What do you make?" : "რას ქმნი?"}</label>
        <select
          id="sps-type"
          value={type}
          onChange={(e) => setType(e.target.value as SellerType)}
        >
          {SELLER_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {en ? option.en : option.ge}
            </option>
          ))}
        </select>
      </div>

      <label className="sps-checkbox">
        <input
          type="checkbox"
          checked={commissions}
          onChange={(e) => setCommissions(e.target.checked)}
        />
        <span>
          🎨{" "}
          {en
            ? "I accept individual (custom) orders"
            : "ვიღებ ინდივიდუალურ შეკვეთებს"}
          <small>
            {en
              ? "Buyers can request a custom piece and you get notified about new requests."
              : "მყიდველები შეძლებენ ინდ. შეკვეთის გამოგზავნას და ახალ შეკვეთებზე შეტყობინებას მიიღებ."}
          </small>
        </span>
      </label>

      <div className="sps-socials">
        <h4>{en ? "Social links" : "სოციალური ბმულები"}</h4>
        <div className="sps-socials-grid">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <div className="sps-row" key={key}>
              <label htmlFor={`sps-${key}`}>{label}</label>
              <input
                id={`sps-${key}`}
                type="text"
                value={links[key] || ""}
                placeholder={placeholder}
                onChange={(e) =>
                  setLinks((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="sps-save"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (en ? "Saving…" : "ინახება…") : en ? "Save" : "შენახვა"}
      </button>
    </div>
  );
}
