"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { SellerRegistrationFlow } from "./SellerRegistrationFlow";
import "./SellerAuthModal.css";

interface SellerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  title?: string;
  subtitle?: string;
}

export function SellerAuthModal({
  isOpen,
  onClose,
  onComplete,
  title,
  subtitle,
}: SellerAuthModalProps) {
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
    <div className="sam-overlay" onClick={onClose}>
      <div className="sam-container" onClick={(e) => e.stopPropagation()}>
        <button className="sam-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        
        {(title || subtitle) && (
          <div className="sam-header">
            {title && <h2 className="sam-title">{title}</h2>}
            {subtitle && <p className="sam-subtitle">{subtitle}</p>}
          </div>
        )}
        
        <div className="sam-content">
          <SellerRegistrationFlow
            onComplete={handleComplete}
            showLoginLink={false}
            compact={true}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/**
 * Hook for managing seller auth modal state
 * @returns Modal state and trigger functions
 */
export function useSellerAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [onCompleteCb, setOnCompleteCb] = useState<(() => void) | null>(null);

  const openModal = useCallback((onComplete?: () => void) => {
    setOnCompleteCb(() => onComplete || null);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setOnCompleteCb(null);
  }, []);

  return {
    isOpen,
    openModal,
    closeModal,
    onComplete: onCompleteCb || undefined,
  };
}
