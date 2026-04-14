"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Rocket, Loader2, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import "./promote-modal.css";

interface PromoteProduct {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  images?: string[];
}

interface PromoteModalProps {
  product: PromoteProduct;
  isOpen: boolean;
  onClose: () => void;
}

const PLATFORM_OPTIONS = [
  { id: "facebook", label: "Facebook", icon: "📘", pricePerDay: 5 },
  { id: "instagram", label: "Instagram", icon: "📸", pricePerDay: 5 },
  { id: "google", label: "Google Ads", icon: "🔍", pricePerDay: 10 },
  { id: "tiktok", label: "TikTok", icon: "🎵", pricePerDay: 7 },
];

const DURATION_OPTIONS = [
  { value: 1, labelKa: "1 დღე (ტესტი)", labelEn: "1 day (test)", isTest: true },
  { value: 3, labelKa: "3 დღე", labelEn: "3 days" },
  { value: 7, labelKa: "7 დღე", labelEn: "7 days" },
  { value: 14, labelKa: "14 დღე", labelEn: "14 days" },
  { value: 30, labelKa: "30 დღე", labelEn: "30 days" },
];

export function PromoteModal({ product, isOpen, onClose }: PromoteModalProps) {
  const { language } = useLanguage();
  const [platforms, setPlatforms] = useState<string[]>(["facebook"]);
  const [duration, setDuration] = useState(7);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isKa = language !== "en";
  const productId = product._id || product.id;

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const totalPrice = useMemo(() => {
    const dailyCost = PLATFORM_OPTIONS.filter((p) =>
      platforms.includes(p.id),
    ).reduce((sum, p) => sum + p.pricePerDay, 0);
    return dailyCost * duration;
  }, [platforms, duration]);

  const handlePayment = async () => {
    if (platforms.length === 0) {
      toast({
        variant: "destructive",
        title: isKa ? "შეცდომა" : "Error",
        description: isKa
          ? "აირჩიეთ მინიმუმ ერთი პლატფორმა"
          : "Select at least one platform",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post("/payments/bog/promotion/create", {
        productId,
        productName: product.name || "უსახელო",
        productPrice: product.price || 0,
        productImage: product.images?.[0] || "",
        platforms,
        duration,
        totalPrice,
        note: note.trim() || undefined,
      });

      const { redirectUrl } = response.data;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error("No redirect URL");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast({
        variant: "destructive",
        title: isKa ? "შეცდომა" : "Error",
        description: message,
      });
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPlatforms(["facebook"]);
    setDuration(7);
    setNote("");
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="promote-overlay" onClick={handleClose}>
      <div className="promote-modal" onClick={(e) => e.stopPropagation()}>
        <button className="promote-close" onClick={handleClose}>
          <X size={20} />
        </button>

        <div className="promote-test-banner">
          🧪{" "}
          {isKa
            ? "სატესტო რეჟიმი — ფასები და ფუნქციონალი შესაძლოა შეიცვალოს"
            : "Test mode — prices and features may change"}
        </div>

        <div className="promote-header">
          <Rocket size={24} />
          <h2>{isKa ? "ნახვების გაზრდა" : "Boost Views"}</h2>
        </div>

        <p className="promote-product-name">📦 {product.name}</p>

        {/* Platforms */}
        <div className="promote-section">
          <label className="promote-label">
            {isKa ? "📢 პლატფორმები" : "📢 Platforms"}
          </label>
          <div className="promote-platforms">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p.id}
                className={`promote-platform-btn ${platforms.includes(p.id) ? "active" : ""}`}
                onClick={() => togglePlatform(p.id)}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                <span className="promote-platform-price">
                  {p.pricePerDay}₾/{isKa ? "დღე" : "day"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="promote-section">
          <label className="promote-label">
            {isKa ? "⏱️ ხანგრძლივობა" : "⏱️ Duration"}
          </label>
          <div className="promote-duration-options">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.value}
                className={`promote-duration-btn ${duration === d.value ? "active" : ""}`}
                onClick={() => setDuration(d.value)}
              >
                {isKa ? d.labelKa : d.labelEn}
              </button>
            ))}
          </div>

          {duration === 1 && (
            <p className="promote-duration-warning">
              ⚠️{" "}
              {isKa
                ? "1 დღიანი რეკლამა სატესტოა — მოკლე პერიოდში მნიშვნელოვან შედეგს ნაკლებად უნდა ელოდოთ. მეტი ეფექტისთვის აირჩიეთ 3+ დღე."
                : "A 1-day ad is for testing — don't expect significant results in such a short period. For better impact, choose 3+ days."}
            </p>
          )}
        </div>

        {/* Note */}
        <div className="promote-section">
          <label className="promote-label">
            {isKa
              ? "📝 დამატებითი შენიშვნა (არასავალდებულო)"
              : "📝 Additional note (optional)"}
          </label>
          <textarea
            className="promote-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isKa
                ? "მაგ: ტარგეტირება 25-35 წლის ქალებზე..."
                : "e.g. Target women aged 25-35..."
            }
          />
        </div>

        {/* Summary */}
        <div className="promote-summary">
          <div className="promote-summary-row">
            <span>{isKa ? "საერთო ღირებულება:" : "Total cost:"}</span>
            <span className="promote-total">{totalPrice}₾</span>
          </div>
          <p className="promote-info-text">
            🕐{" "}
            {isKa
              ? "რეკლამა გაეშვება მომდევნო 24 საათის განმავლობაში"
              : "Ad will launch within the next 24 hours"}
          </p>
          <p className="promote-info-text">
            👁️{" "}
            {isKa
              ? "პროდუქტის ნახვების რაოდენობას იხილავთ პროდუქტის დეტალურ გვერდზე"
              : "You can see product view count on the product detail page"}
          </p>
        </div>

        {/* Pay Button */}
        <button
          className="promote-submit-btn"
          onClick={handlePayment}
          disabled={isSubmitting || platforms.length === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="spin" />
              {isKa ? "მიმდინარეობს..." : "Processing..."}
            </>
          ) : (
            <>
              <CreditCard size={18} />
              {isKa
                ? `გადახდა — ${totalPrice}₾`
                : `Pay — ${totalPrice}₾`}
            </>
          )}
        </button>
      </div>
    </div>,
    document.body,
  );
}
