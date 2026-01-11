"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/use-auth";
import { BecomeSellerModal } from "../become-seller-modal/become-seller-modal";
import "./become-seller-button.css";

interface BecomeSellerButtonProps {
  userPhone?: string;
  userIdentificationNumber?: string;
  userAccountNumber?: string;
  userBeneficiaryBankCode?: string;
  className?: string;
}

export function BecomeSellerButton({
  userPhone,
  userIdentificationNumber,
  userAccountNumber,
  userBeneficiaryBankCode,
  className = "",
}: BecomeSellerButtonProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't show button if user is already a seller or seller+sales_manager
  if (user?.role === "seller" || user?.role === "seller_sales_manager") {
    return null;
  }

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        className={`become-seller-button ${className}`}
      >
        <span className="button-icon">🏪</span>
        <span className="button-text">{t("profile.becomeSeller")}</span>
      </button>

      <BecomeSellerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userPhone={userPhone}
        userIdentificationNumber={userIdentificationNumber}
        userAccountNumber={userAccountNumber}
        userBeneficiaryBankCode={userBeneficiaryBankCode}
      />
    </>
  );
}
