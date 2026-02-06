"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { SellerRegistrationFlow } from "@/components/auth/SellerRegistrationFlow";
import "./become-seller-modal.css";

interface BecomeSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customMessage?: string;
  onComplete?: () => void;
}

export function BecomeSellerModal({
  isOpen,
  onClose,
  customMessage,
  onComplete,
}: BecomeSellerModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleComplete = useCallback(() => {
    onClose();
    if (onComplete) onComplete();
  }, [onClose, onComplete]);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="seller-modal-overlay" onClick={onClose}>
      <div className={`modal-content${customMessage ? " has-message" : ""}`} onClick={(e) => e.stopPropagation()}>
        {customMessage && (
          <div className="custom-message-banner">
            <span className="banner-icon">ℹ️</span>
            <p>{customMessage}</p>
          </div>
        )}
        <button
          type="button"
          className="close-button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <SellerRegistrationFlow
          onComplete={handleComplete}
          redirectTo="/profile/auctions/create"
          showLoginLink={true}
          compact={true}
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
