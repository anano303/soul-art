"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useBecomeSeller } from "@/modules/auth/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import Image from "next/image";
import "./become-seller-modal.css";

const becomeSellerSchema = z.object({
  storeName: z.string().min(1, "მაღაზიის სახელი აუცილებელია"),
  identificationNumber: z.string().min(1, "პირადი ნომერი აუცილებელია"),
  accountNumber: z.string().min(1, "საბანკო ანგარიში აუცილებელია"),
  phoneNumber: z.string().optional(),
  invitationCode: z.string().optional(),
});

type BecomeSellerFormData = z.infer<typeof becomeSellerSchema>;

interface BecomeSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhone?: string; // Current user's phone if they have it
}

export function BecomeSellerModal({
  isOpen,
  onClose,
  userPhone,
}: BecomeSellerModalProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { mutate: becomeSeller, isPending } = useBecomeSeller();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BecomeSellerFormData>({
    resolver: zodResolver(becomeSellerSchema),
    defaultValues: {
      phoneNumber: userPhone || "",
    },
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        if (e.target?.result) {
          setLogoPreview(e.target.result as string);
        }
      };
      fileReader.readAsDataURL(file);
    }
  };

  const onSubmit = handleSubmit((data) => {
    // Additional check to prevent submission if already processing
    if (isPending) {
      return;
    }

    const formData = new FormData();

    // Add all form fields to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        formData.append(key, value as string);
      }
    });

    // Add the logo file if it exists
    if (fileInputRef.current?.files?.length) {
      formData.append("logoFile", fileInputRef.current.files[0]);
    }

    becomeSeller(formData, {
      onSuccess: () => {
        toast({
          title: t("profile.becomeSellerSuccess"),
          description: t("profile.becomeSellerSuccessDescription"),
          variant: "default",
        });

        // Refresh user data once
        queryClient.invalidateQueries({ queryKey: ["user"] });

        // Reset form and close modal
        reset();
        setLogoPreview(null);
        onClose();
      },
      onError: (error) => {
        toast({
          title: t("profile.becomeSellerError"),
          description: error.message,
          variant: "destructive",
        });
      },
    });
  });

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClose = () => {
    reset();
    setLogoPreview(null);
    onClose();
  };

  // Prevent body scroll when modal is open and handle mounting
  useEffect(() => {
    setMounted(true);

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="seller-modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("profile.becomeSeller")}</h2>
          <button
            type="button"
            className="close-button"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="become-seller-form">
          <div className="form-group">
            <label htmlFor="storeName">{t("profile.sellerStoreName")} *</label>
            <input
              id="storeName"
              type="text"
              placeholder={t("profile.sellerStoreNamePlaceholder")}
              {...register("storeName")}
              className="form-input"
            />
            {errors.storeName && (
              <span className="error-message">
                {t("profile.sellerStoreNameRequired")}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="logoFile">{t("profile.sellerLogo")}</label>
            <div className="logo-upload-section">
              {logoPreview && (
                <div className="logo-preview">
                  <Image
                    src={logoPreview}
                    alt="Store Logo"
                    width={80}
                    height={80}
                    className="logo-preview-image"
                  />
                </div>
              )}
              <input
                ref={fileInputRef}
                id="logoFile"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="file-input"
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={triggerFileInput}
                className="file-upload-button"
              >
                {logoPreview
                  ? t("profile.sellerLogoUpload")
                  : t("profile.sellerLogoChoose")}
              </button>
            </div>
          </div>

          {!userPhone && (
            <div className="form-group">
              <label htmlFor="phoneNumber">{t("profile.phoneNumber")}</label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="+995XXXXXXXXX"
                {...register("phoneNumber")}
                className="form-input"
              />
              {errors.phoneNumber && (
                <span className="error-message">
                  {errors.phoneNumber.message}
                </span>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="identificationNumber">
              {t("profile.sellerIdNumber")} *
            </label>
            <input
              id="identificationNumber"
              type="text"
              placeholder={t("profile.sellerIdNumberPlaceholder")}
              {...register("identificationNumber")}
              className="form-input"
            />
            {errors.identificationNumber && (
              <span className="error-message">
                {t("profile.sellerIdNumberRequired")}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="accountNumber">
              {t("profile.sellerAccountNumber")} *
            </label>
            <input
              id="accountNumber"
              type="text"
              placeholder={t("profile.sellerAccountNumberPlaceholder")}
              {...register("accountNumber")}
              className="form-input"
            />
            {errors.accountNumber && (
              <span className="error-message">
                {t("profile.sellerAccountNumberRequired")}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="invitationCode">{t("auth.referralCode")}</label>
            <input
              id="invitationCode"
              type="text"
              placeholder="ABC123"
              {...register("invitationCode")}
              className="form-input"
            />
            {errors.invitationCode && (
              <span className="error-message">
                {errors.invitationCode.message}
              </span>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="cancel-button"
              disabled={isPending}
            >
              {t("profile.sellerCancel")}
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isPending}
            >
              {isPending
                ? t("profile.becomeSellerSubmitting")
                : t("profile.sellerSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  return createPortal(modalContent, document.body);
}
