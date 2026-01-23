"use client";

import { useState, useCallback, useEffect } from "react";
import Cookies from "js-cookie";
import { Gift, X, Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { apiClient } from "@/lib/axios";
import "./referral-code-input.css";

interface ReferralCodeInputProps {
  variant?: "header" | "floating" | "inline";
}

export function ReferralCodeInput({
  variant = "header",
}: ReferralCodeInputProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [hasActiveCode, setHasActiveCode] = useState(false);

  // Check if user already has a referral code
  useEffect(() => {
    const existingCode = Cookies.get("sales_ref");
    if (existingCode && existingCode.startsWith("SM_")) {
      setHasActiveCode(true);
    }
  }, []);

  const validateAndSaveCode = useCallback(async () => {
    const trimmedCode = code.trim().toUpperCase();

    // Validate format
    if (!trimmedCode) {
      setStatus("error");
      setMessage(
        language === "en" ? "Please enter a code" : "გთხოვთ შეიყვანეთ კოდი"
      );
      return;
    }

    // Add SM_ prefix if not present
    const fullCode = trimmedCode.startsWith("SM_")
      ? trimmedCode
      : `SM_${trimmedCode}`;

    setStatus("loading");

    try {
      // Validate the code with the server
      const response = await apiClient.get(
        `/sales-commission/validate/${fullCode}`
      );

      if (response.data?.valid) {
        // Save to cookie (7 days)
        Cookies.set("sales_ref", fullCode, {
          expires: 7,
          path: "/",
          sameSite: "lax",
        });

        setStatus("success");
        setMessage(language === "en" ? "Code applied!" : "კოდი გააქტიურდა!");
        setHasActiveCode(true);

        // Track the visit
        try {
          await apiClient.post("/sales-commission/track", {
            salesRefCode: fullCode,
            eventType: "visit",
            landingPage: window.location.pathname,
          });
        } catch (e) {
          // Ignore tracking errors
        }

        // Close after success
        setTimeout(() => {
          setIsOpen(false);
          // Reload to apply discounts
          window.location.reload();
        }, 1500);
      } else {
        setStatus("error");
        setMessage(
          language === "en"
            ? "Invalid code. Please check and try again."
            : "არასწორი კოდი. გთხოვთ შეამოწმეთ და სცადეთ თავიდან."
        );
      }
    } catch (error: any) {
      setStatus("error");
      if (error.response?.status === 404) {
        setMessage(language === "en" ? "Code not found" : "კოდი ვერ მოიძებნა");
      } else {
        setMessage(
          language === "en"
            ? "Error validating code"
            : "კოდის შემოწმებისას მოხდა შეცდომა"
        );
      }
    }
  }, [code, language]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      validateAndSaveCode();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const clearCode = useCallback(() => {
    Cookies.remove("sales_ref");
    setHasActiveCode(false);
    setCode("");
    setStatus("idle");
    setMessage("");
    window.location.reload();
  }, []);

  // Don't show if user already has active code (unless they want to change it)
  if (hasActiveCode && !isOpen) {
    return (
      <div
        className={`ref-code-active ${
          variant === "floating" ? "ref-code-floating" : ""
        }`}
      >
        <Gift size={14} />
        <span>{language === "en" ? "Promo active" : "პრომო აქტიურია"}</span>
        <button
          onClick={clearCode}
          className="ref-code-clear"
          title={language === "en" ? "Remove code" : "წაშლა"}
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  if (variant === "floating" || variant === "header") {
    return (
      <div
        className={`ref-code-container ${
          variant === "floating" ? "ref-code-floating" : ""
        }`}
      >
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="ref-code-trigger"
            title={
              language === "en" ? "Enter promo code" : "შეიყვანეთ პრომო კოდი"
            }
          >
            <Gift size={16} />
            <span className="ref-code-trigger-text">
              {language === "en" ? "Promo code" : "პრომო კოდი"}
            </span>
          </button>
        ) : (
          <div className="ref-code-input-wrapper">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setStatus("idle");
                setMessage("");
              }}
              onKeyDown={handleKeyDown}
              placeholder={language === "en" ? "Enter code..." : "კოდი..."}
              className="ref-code-input"
              autoFocus
              disabled={status === "loading" || status === "success"}
            />
            <button
              onClick={validateAndSaveCode}
              className="ref-code-submit"
              disabled={status === "loading" || status === "success"}
            >
              {status === "loading" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : status === "success" ? (
                <Check size={14} />
              ) : (
                "OK"
              )}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setCode("");
                setStatus("idle");
                setMessage("");
              }}
              className="ref-code-close"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {message && (
          <div
            className={`ref-code-message ${
              status === "error"
                ? "ref-code-message--error"
                : "ref-code-message--success"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    );
  }

  return null;
}
