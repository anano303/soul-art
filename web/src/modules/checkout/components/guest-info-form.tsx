"use client";

import { useState } from "react";
import { useCheckout } from "../context/checkout-context";
import { useLanguage } from "@/hooks/LanguageContext";
import { apiClient } from "@/lib/axios";
import "./guest-info-form.css";

interface GuestInfoFormProps {
  onContinue: () => void;
  onSignIn: () => void;
}

export function GuestInfoForm({ onContinue, onSignIn }: GuestInfoFormProps) {
  const { setGuestInfo, guestInfo } = useCheckout();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    email: guestInfo?.email || "",
    phoneNumber: guestInfo?.phoneNumber || "",
    fullName: guestInfo?.fullName || "",
  });

  const [errors, setErrors] = useState({
    email: "",
    phoneNumber: "",
    fullName: "",
  });

  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const response = await apiClient.post("/auth/check-email", { email });
      return response.data.exists;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  };

  const handleEmailBlur = async () => {
    if (formData.email && validateEmail(formData.email)) {
      setIsCheckingEmail(true);
      const exists = await checkEmailExists(formData.email.trim());
      setEmailExists(exists);
      setIsCheckingEmail(false);
      
      if (exists) {
        setErrors(prev => ({
          ...prev,
          email: t("checkout.guest.emailExists"),
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      email: "",
      phoneNumber: "",
      fullName: "",
    };

    if (!formData.email.trim()) {
      newErrors.email = t("checkout.guest.emailRequired");
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t("checkout.guest.emailInvalid");
    } else if (emailExists) {
      newErrors.email = t("checkout.guest.emailExists");
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t("checkout.guest.phoneRequired");
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = t("checkout.guest.fullNameRequired");
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.phoneNumber && !newErrors.fullName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check email one more time before submitting
    if (formData.email && validateEmail(formData.email)) {
      setIsCheckingEmail(true);
      const exists = await checkEmailExists(formData.email.trim());
      setEmailExists(exists);
      setIsCheckingEmail(false);
      
      if (exists) {
        setErrors(prev => ({
          ...prev,
          email: t("checkout.guest.emailExists"),
        }));
        return;
      }
    }

    if (validateForm()) {
      setGuestInfo({
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        fullName: formData.fullName.trim(),
      });
      onContinue();
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="guest-info-form-container">
      <div className="guest-info-header">
        <h2>{t("checkout.guest.title")}</h2>
        <p className="guest-info-description">{t("checkout.guest.description")}</p>
      </div>

      <form onSubmit={handleSubmit} className="guest-info-form">
        {/* Full Name */}
        <div className="form-group">
          <label htmlFor="fullName">
            {t("checkout.guest.fullName")} <span className="required">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder={t("checkout.guest.fullNamePlaceholder")}
            className={errors.fullName ? "error" : ""}
          />
          {errors.fullName && <span className="error-message">{errors.fullName}</span>}
        </div>

        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">
            {t("checkout.guest.email")} <span className="required">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => {
              handleChange("email", e.target.value);
              setEmailExists(false); // Reset when user changes email
            }}
            onBlur={handleEmailBlur}
            placeholder={t("checkout.guest.emailPlaceholder")}
            className={errors.email ? "error" : ""}
            disabled={isCheckingEmail}
          />
          {isCheckingEmail && <span className="info-message">{t("checkout.guest.checkingEmail")}</span>}
          {errors.email && <span className="error-message">{errors.email}</span>}
          {emailExists && !errors.email && (
            <span className="info-message">
              {t("checkout.guest.emailExistsPrompt")}{" "}
              <button type="button" onClick={onSignIn} className="inline-link">
                {t("checkout.guest.signIn")}
              </button>
            </span>
          )}
        </div>

        {/* Phone Number */}
        <div className="form-group">
          <label htmlFor="phoneNumber">
            {t("checkout.guest.phone")} <span className="required">*</span>
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => handleChange("phoneNumber", e.target.value)}
            placeholder={t("checkout.guest.phonePlaceholder")}
            className={errors.phoneNumber ? "error" : ""}
          />
          {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
        </div>

        <button type="submit" className="continue-button">
          {t("checkout.guest.continueToShipping")}
        </button>
      </form>

      <div className="sign-in-prompt">
        <p>
          {t("checkout.guest.alreadyHaveAccount")}{" "}
          <button type="button" onClick={onSignIn} className="sign-in-link">
            {t("checkout.guest.signIn")}
          </button>
        </p>
      </div>
    </div>
  );
}
