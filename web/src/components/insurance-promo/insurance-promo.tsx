"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Shield, Home, CheckCircle } from "lucide-react";
import "./insurance-promo.css";

const STORAGE_KEY = "insurance_promo_dismissed";
const DELAY_MS = 4 * 60 * 1000; // 4 წუთი

const InsurancePromo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // თუ უკვე დახურა, აღარ აჩვენო
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
      document.body.style.overflow = "hidden";
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [mounted]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      document.body.style.overflow = "";
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }, 300);
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, handleClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className={`insurance-promo-overlay ${isClosing ? "insurance-promo-overlay--closing" : ""}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`insurance-promo ${isClosing ? "insurance-promo--closing" : ""}`}
      >
        <button
          className="insurance-promo__close"
          onClick={handleClose}
          aria-label="დახურვა"
        >
          <X size={20} />
        </button>

        {/* ზედა ნაწილი - ვიზუალი */}
        <div className="insurance-promo__header">
          <div className="insurance-promo__shield-icon">
            <Shield size={48} strokeWidth={1.5} />
          </div>
          <div className="insurance-promo__header-decor">
            <Home size={20} className="insurance-promo__house-icon" />
          </div>
        </div>

        {/* კონტენტი */}
        <div className="insurance-promo__content">
          <span className="insurance-promo__badge">
            პარტნიორის შეთავაზება
          </span>
          <h2 className="insurance-promo__title">
            დააზღვიე შენი ბინა
          </h2>
          <p className="insurance-promo__subtitle">
            ექსკლუზიური პირობები <strong>SoulArt</strong>-ის მომხმარებლებისთვის
          </p>

          <div className="insurance-promo__features">
            <div className="insurance-promo__feature">
              <CheckCircle size={16} />
              <span>თვეში მხოლოდ <strong>12 ₾</strong>-დან</span>
            </div>
            <div className="insurance-promo__feature">
              <CheckCircle size={16} />
              <span>რემონტი · ავეჯი · ტექნიკა</span>
            </div>
            <div className="insurance-promo__feature">
              <CheckCircle size={16} />
              <span>მეზობლისთვის მიყენებულ ზარალსაც <strong>დაზღვევა ფარავს!</strong></span>
            </div>
          </div>

          <a
            href="https://insure.myprime.ge/"
            target="_blank"
            rel="noopener noreferrer"
            className="insurance-promo__cta"
            onClick={handleClose}
          >
            გაიგე მეტი
          </a>

          <p className="insurance-promo__partner">
            <Image
              src="https://insure.myprime.ge/_next/image?url=%2FprimeLogo.png&w=128&q=75"
              alt="PRIME Insurance"
              width={60}
              height={20}
              className="insurance-promo__partner-logo"
              unoptimized
            />
            PRIME Insurance
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InsurancePromo;
