"use client";

import React, { useState } from "react";
import "./DonationModal.css";
import { useLanguage } from "@/hooks/LanguageContext";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100];

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showInSponsors, setShowInSponsors] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAmountSelect = (value: number) => {
    setAmount(value);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    if (value && !isNaN(Number(value))) {
      setAmount(Number(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!donorName.trim() && !isAnonymous) {
      setError(t("donation.nameRequired"));
      return;
    }

    if (amount < 1) {
      setError(t("donation.minAmount"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/donations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            donorName: isAnonymous ? "ანონიმური" : donorName,
            donorEmail,
            message,
            isAnonymous,
            showInSponsors,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.redirect_url) {
        // Redirect to BOG payment page
        window.location.href = data.redirect_url;
      } else {
        setError(data.message || t("donation.error"));
      }
    } catch (err) {
      console.error("Donation error:", err);
      setError(t("donation.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donation-modal-overlay" onClick={onClose}>
      <div
        className="donation-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="donation-modal-close" onClick={onClose}>
          ×
        </button>

        <div className="donation-modal-header">
          <div className="donation-icon">❤️</div>
          <h2>{t("donation.title")}</h2>
          <p className="donation-subtitle">{t("donation.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="donation-form">
          {/* Amount Selection */}
          <div className="donation-section">
            <label className="donation-label">{t("donation.selectAmount")}</label>
            <div className="amount-buttons">
              {PRESET_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`amount-btn ${amount === value && !customAmount ? "active" : ""}`}
                  onClick={() => handleAmountSelect(value)}
                >
                  {value} ₾
                </button>
              ))}
            </div>
            <div className="custom-amount">
              <input
                type="number"
                placeholder={t("donation.customAmount")}
                value={customAmount}
                onChange={handleCustomAmountChange}
                min="1"
                className="donation-input"
              />
              <span className="currency-label">₾</span>
            </div>
          </div>

          {/* Donor Info */}
          <div className="donation-section">
            <label className="donation-label">{t("donation.yourInfo")}</label>
            
            <div className="anonymous-toggle">
              <input
                type="checkbox"
                id="isAnonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <label htmlFor="isAnonymous">{t("donation.anonymous")}</label>
            </div>

            {!isAnonymous && (
              <>
                <input
                  type="text"
                  placeholder={t("donation.namePlaceholder")}
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="donation-input"
                  required={!isAnonymous}
                />
                <input
                  type="email"
                  placeholder={t("donation.emailPlaceholder")}
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  className="donation-input"
                />
              </>
            )}
          </div>

          {/* Message */}
          <div className="donation-section">
            <label className="donation-label">{t("donation.leaveMessage")}</label>
            <textarea
              placeholder={t("donation.messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="donation-input donation-textarea"
              rows={3}
            />
          </div>

          {/* Show in sponsors */}
          <div className="donation-section">
            <div className="sponsor-toggle">
              <input
                type="checkbox"
                id="showInSponsors"
                checked={showInSponsors}
                onChange={(e) => setShowInSponsors(e.target.checked)}
              />
              <label htmlFor="showInSponsors">{t("donation.showInSponsors")}</label>
            </div>
          </div>

          {error && <div className="donation-error">{error}</div>}

          <button
            type="submit"
            className="donation-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <span className="heart-icon">💝</span>
                {t("donation.donate")} {amount} ₾
              </>
            )}
          </button>

          <p className="donation-security-note">
            🔒 {t("donation.securePayment")}
          </p>
        </form>
      </div>
    </div>
  );
}
