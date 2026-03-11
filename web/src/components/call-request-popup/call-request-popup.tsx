"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Phone, Loader2, CheckCircle } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import "./call-request-popup.css";

const STORAGE_KEY = "soulart_call_popup_dismissed";
const POPUP_DELAY_MS = 2 * 60 * 1000; // 2 წუთი
const DISMISS_DAYS = 7; // 7 დღეში ხელახლა აჩვენებს

export function CallRequestPopup() {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    // შევამოწმოთ ადრე დახურა თუ არა
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) {
        return; // ჯერ კიდევ დახურულია
      }
    }

    // 2 წუთის შემდეგ აჩვენე
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!formData.name.trim()) {
        setError(
          language === "en"
            ? "Please enter your name"
            : "გთხოვთ შეიყვანეთ სახელი"
        );
        return;
      }

      if (!formData.phone.trim()) {
        setError(
          language === "en"
            ? "Please enter your phone number"
            : "გთხოვთ შეიყვანეთ ტელეფონის ნომერი"
        );
        return;
      }

      setIsSubmitting(true);

      try {
        const res = await fetch("/api/call-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim() || undefined,
          }),
        });

        if (!res.ok) {
          throw new Error("Request failed");
        }

        setIsSuccess(true);
        localStorage.setItem(STORAGE_KEY, Date.now().toString());

        // 3 წამის შემდეგ დახურე
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      } catch {
        setError(
          language === "en"
            ? "Something went wrong. Please try again."
            : "დაფიქსირდა შეცდომა. გთხოვთ სცადოთ ხელახლა."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, language]
  );

  if (!isVisible) return null;

  return (
    <div className="call-popup-overlay" onClick={handleDismiss}>
      <div className="call-popup" onClick={(e) => e.stopPropagation()}>
        <button className="call-popup-close" onClick={handleDismiss}>
          <X size={20} />
        </button>

        {isSuccess ? (
          <div className="call-popup-success">
            <CheckCircle size={48} className="call-popup-success-icon" />
            <h3>
              {language === "en"
                ? "Request Sent!"
                : "მოთხოვნა გაიგზავნა!"}
            </h3>
            <p>
              {language === "en"
                ? "We will call you shortly"
                : "მალე დაგიკავშირდებით"}
            </p>
          </div>
        ) : (
          <>
            <div className="call-popup-header">
              <div className="call-popup-icon">
                <Phone size={28} />
              </div>
              <h3 className="call-popup-title">
                {language === "en"
                  ? "Need help choosing?"
                  : "დახმარება გჭირდება არჩევაში?"}
              </h3>
              <p className="call-popup-subtitle">
                {language === "en"
                  ? "Request a free callback and we'll help you find the perfect artwork or handmade item"
                  : "მოითხოვე უფასო ზარი და დაგეხმარებით სასურველი ნახატის ან ხელნაკეთი ნივთის არჩევაში"}
              </p>
            </div>

            <form className="call-popup-form" onSubmit={handleSubmit}>
              <div className="call-popup-field">
                <label>
                  {language === "en" ? "Name *" : "სახელი, გვარი *"}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={
                    language === "en" ? "Your name" : "თქვენი სახელი, გვარი"
                  }
                  autoComplete="name"
                />
              </div>

              <div className="call-popup-field">
                <label>
                  {language === "en"
                    ? "Phone number *"
                    : "ტელეფონის ნომერი *"}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+995 5XX XXX XXX"
                  autoComplete="tel"
                />
              </div>

              <div className="call-popup-field">
                <label>
                  {language === "en"
                    ? "Email (optional)"
                    : "ელ. ფოსტა (არასავალდებულო)"}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="example@mail.com"
                  autoComplete="email"
                />
              </div>

              {error && <p className="call-popup-error">{error}</p>}

              <button
                type="submit"
                className="call-popup-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    {language === "en" ? "Sending..." : "იგზავნება..."}
                  </>
                ) : (
                  <>
                    <Phone size={18} />
                    {language === "en"
                      ? "Request a Callback"
                      : "ზარის მოთხოვნა"}
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
