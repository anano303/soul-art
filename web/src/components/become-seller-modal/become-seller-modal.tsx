"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import { GEORGIAN_BANKS, detectBankFromIban } from "@/utils/georgian-banks";
import { apiClient } from "@/lib/axios";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_VALIDATION_MESSAGE =
  "სლაგი უნდა შედგებოდეს 3-40 სიმბოლოსგან (პატარა ლათინური ასოები, ციფრები და ჰიფენი)";

const becomeSellerSchema = z.object({
  storeName: z.string().min(1, "მაღაზიის სახელი აუცილებელია"),
  identificationNumber: z.string().min(1, "პირადი ნომერი აუცილებელია"),
  accountNumber: z.string().min(1, "საბანკო ანგარიში აუცილებელია"),
  beneficiaryBankCode: z.string().min(1, "ბანკი აუცილებელია"),
  phoneNumber: z.string().optional(),
  invitationCode: z.string().optional(),
  artistSlug: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .refine(
      (value) =>
        value === "" ||
        (value.length >= 3 &&
          value.length <= 40 &&
          SLUG_PATTERN.test(value)),
      {
        message: SLUG_VALIDATION_MESSAGE,
        path: ["artistSlug"],
      }
    ),
}).refine(
  (data) => {
    if (data.accountNumber && data.accountNumber.trim()) {
      const iban = data.accountNumber.trim();
      const detectedBank = detectBankFromIban(iban);
      return detectedBank !== null;
    }
    return true;
  },
  {
    message: "არასწორი IBAN. გთხოვთ შეიყვანოთ ქართული IBAN (22 სიმბოლო, იწყება GE-ით)",
    path: ["accountNumber"],
  }
);

type BecomeSellerFormData = z.infer<typeof becomeSellerSchema>;

interface BecomeSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhone?: string; // Current user's phone if they have it
  userIdentificationNumber?: string; // Current user's ID number
  userAccountNumber?: string; // Current user's bank account (IBAN)
  userBeneficiaryBankCode?: string; // Current user's bank code
}

export function BecomeSellerModal({
  isOpen,
  onClose,
  userPhone,
  userIdentificationNumber,
  userAccountNumber,
  userBeneficiaryBankCode,
}: BecomeSellerModalProps) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { mutate: becomeSeller, isPending } = useBecomeSeller();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  type SlugStatus = "idle" | "checking" | "available" | "taken" | "error";
  const [slugInput, setSlugInput] = useState<string>("");
  const [suggestedSlug, setSuggestedSlug] = useState<string>("");
  const [isSlugAuto, setIsSlugAuto] = useState<boolean>(true);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugMessage, setSlugMessage] = useState<string>("");
  const slugRequestIdRef = useRef(0);
  const manualCheckIdRef = useRef(0);

  const portfolioBaseUrl =
    process.env.NEXT_PUBLIC_WEBSITE_URL || "https://soulart.ge";
  const portfolioDisplayBase = portfolioBaseUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const slugDisplayPrefix = `${portfolioDisplayBase}/@`;
  const portfolioLinkBase = portfolioBaseUrl.replace(/\/$/, "");

  const slugStatusColors: Record<SlugStatus, string> = {
    idle: "#4b5563",
    checking: "#2563eb",
    available: "#15803d",
    taken: "#b91c1c",
    error: "#b45309",
  };

  const {
    register,
    unregister,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BecomeSellerFormData>({
    resolver: zodResolver(becomeSellerSchema),
    defaultValues: {
      phoneNumber: userPhone || "",
      identificationNumber: userIdentificationNumber || "",
      accountNumber: userAccountNumber || "",
      beneficiaryBankCode: userBeneficiaryBankCode || "",
      artistSlug: "",
    },
  });

  useEffect(() => {
    register("artistSlug");
    return () => {
      unregister("artistSlug");
    };
  }, [register, unregister]);

  const storeNameValue = watch("storeName");

  const setSlugValue = useCallback(
    (value: string, options?: { validate?: boolean; markDirty?: boolean }) => {
      setSlugInput(value);
      setValue("artistSlug", value, {
        shouldDirty: options?.markDirty ?? true,
        shouldValidate: options?.validate ?? true,
      });
    },
    [setValue]
  );

  const slugify = useCallback((input: string) => {
    if (!input) return "";
    return input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "");
  }, []);

  const buildAutoSlug = useCallback(
    (input: string) => {
      const base = slugify(input);
      if (base.length >= 3) {
        return base;
      }
      return base.length > 0 ? `${base}-${Date.now().toString().slice(-2)}` : "artist";
    },
    [slugify]
  );

  const ensureSuggestedSlug = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        slugRequestIdRef.current += 1;
        setSuggestedSlug("");
        setSlugStatus("idle");
        setSlugMessage("");
        setSlugValue("", { validate: true, markDirty: false });
        return;
      }

      const baseCandidate = buildAutoSlug(trimmed);
      const requestId = ++slugRequestIdRef.current;

      setSlugStatus("checking");
      setSlugMessage(
        language === "en"
          ? "Checking link availability..."
          : "მიმდინარეობს ბმულის შემოწმება..."
      );

      try {
        let attempt = 0;
        let candidate = baseCandidate;

        while (true) {
          const { data } = await apiClient.get("/artists/slug/check", {
            params: { slug: candidate },
          });

          if (slugRequestIdRef.current !== requestId) {
            return;
          }

          if (data.available) {
            setSuggestedSlug(candidate);
            setSlugValue(candidate, { validate: true });
            setSlugStatus("available");
            setSlugMessage(
              language === "en"
                ? `We'll reserve ${portfolioLinkBase}/@${candidate} for you`
                : `${portfolioLinkBase}/@${candidate} შენთვის იქნება დაჯავშნილი`
            );
            return;
          }

          attempt += 1;
          if (attempt > 99) {
            throw new Error("No available slug variations");
          }
          candidate = `${baseCandidate}-${attempt}`;
        }
      } catch (error) {
        if (slugRequestIdRef.current !== requestId) {
          return;
        }
        console.error("Slug suggestion failed", error);
        setSuggestedSlug(baseCandidate);
        setSlugValue(baseCandidate, { validate: true });
        setSlugStatus("error");
        setSlugMessage(
          language === "en"
            ? "We couldn't auto-generate a unique link. Please adjust manually."
            : "ბმულის ავტომატური გენერაცია ვერ მოხერხდა. გთხოვთ, შეცვალოთ ხელით."
        );
      }
    },
    [buildAutoSlug, language, portfolioLinkBase, setSlugValue]
  );

  const checkSlugManually = useCallback(
    async (slug: string, checkId: number) => {
      if (!slug) {
        return;
      }

      try {
        const { data } = await apiClient.get("/artists/slug/check", {
          params: { slug },
        });

        if (manualCheckIdRef.current !== checkId) {
          return;
        }

        if (data.available) {
          setSlugStatus("available");
          setSlugMessage(
            language === "en"
              ? `${portfolioLinkBase}/@${slug} is available`
              : `${portfolioLinkBase}/@${slug} თავისუფალია`
          );
        } else {
          setSlugStatus("taken");
          setSlugMessage(
            data.reason === "reserved"
              ? language === "en"
                ? "This slug is reserved. Please choose another."
                : "ეს სლაგი დაჯავშნულია. გთხოვთ, აირჩიოთ სხვა."
              : language === "en"
              ? "This link is already taken. Try another."
              : "ეს ბმული უკვე დაკავებულია. სცადე სხვა ვარიანტი."
          );
        }
      } catch (error) {
        if (manualCheckIdRef.current !== checkId) {
          return;
        }
        console.error("Slug availability check failed", error);
        setSlugStatus("error");
        setSlugMessage(
          language === "en"
            ? "Couldn't verify link. Try again later."
            : "ბმულის შემოწმება ვერ მოხერხდა. სცადე მოგვიანებით."
        );
      }
    },
    [language, portfolioLinkBase]
  );

  const resetSlugState = useCallback(() => {
    slugRequestIdRef.current += 1;
    manualCheckIdRef.current += 1;
    setSlugInput("");
    setSuggestedSlug("");
    setIsSlugAuto(true);
    setSlugStatus("idle");
    setSlugMessage("");
    setSlugValue("", { validate: false, markDirty: false });
  }, [setSlugValue]);

  const handleSlugInputChange = useCallback(
    (raw: string) => {
      let sanitized = slugify(raw);
      sanitized = sanitized.slice(0, 40).replace(/-{2,}/g, "-");
      sanitized = sanitized.replace(/^-+|-+$/g, "");

      setIsSlugAuto(false);
      slugRequestIdRef.current += 1;
      setSlugValue(sanitized, { validate: true });

      if (!sanitized) {
        setSlugStatus("idle");
        setSlugMessage("");
      }
    },
    [setSlugValue, slugify]
  );

  const handleUseSuggestedSlug = useCallback(() => {
    setIsSlugAuto(true);
    const source = storeNameValue ?? "";

    if (suggestedSlug) {
      slugRequestIdRef.current += 1;
      setSlugValue(suggestedSlug, { validate: true, markDirty: true });
      setSlugStatus("available");
      setSlugMessage(
        language === "en"
          ? `We'll reserve ${portfolioLinkBase}/@${suggestedSlug} for you`
          : `${portfolioLinkBase}/@${suggestedSlug} შენთვის იქნება დაჯავშნილი`
      );
    }

    ensureSuggestedSlug(source);
  }, [ensureSuggestedSlug, language, portfolioLinkBase, setSlugValue, storeNameValue, suggestedSlug]);

  useEffect(() => {
    if (!isSlugAuto) {
      return;
    }

    const currentValue = storeNameValue ?? "";
    if (!currentValue.trim()) {
      ensureSuggestedSlug(currentValue);
      return;
    }

    const timeoutId = setTimeout(() => {
      ensureSuggestedSlug(currentValue);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [ensureSuggestedSlug, isSlugAuto, storeNameValue]);

  useEffect(() => {
    if (isSlugAuto) {
      return;
    }

    const trimmed = slugInput.trim();
    manualCheckIdRef.current += 1;
    const checkId = manualCheckIdRef.current;

    if (!trimmed) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }

    if (trimmed.length < 3) {
      setSlugStatus("error");
      setSlugMessage(
        language === "en"
          ? "Use at least 3 characters."
          : "გამოიყენე მინიმუმ 3 სიმბოლო."
      );
      return;
    }

    setSlugStatus("checking");
    setSlugMessage(
      language === "en"
        ? "Checking link availability..."
        : "მიმდინარეობს ბმულის შემოწმება..."
    );

    const timeoutId = setTimeout(() => {
      checkSlugManually(trimmed, checkId);
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [checkSlugManually, isSlugAuto, language, slugInput]);

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
        reset({ phoneNumber: userPhone || "", artistSlug: "" });
        resetSlugState();
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
    reset({ phoneNumber: userPhone || "", artistSlug: "" });
    resetSlugState();
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
            <label htmlFor="artistSlug">
              {language === "en"
                ? "Public portfolio link"
                : "საჯარო პორტფოლიოს ბმული"}
            </label>
            <small
              style={{
                display: "block",
                marginTop: "4px",
                color: "#6b7280",
                fontSize: "0.85rem",
                lineHeight: 1.4,
              }}
            >
              {language === "en"
                ? "Choose how your public artist page URL will look."
                : "აირჩიე, როგორ გამოჩნდება შენი საჯარო არტისტის გვერდის მისამართი."}
            </small>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                marginTop: "8px",
              }}
            >
              <span
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                  color: "#374151",
                  whiteSpace: "nowrap",
                }}
              >
                {slugDisplayPrefix}
              </span>
              <input
                id="artistSlug"
                type="text"
                value={slugInput}
                onChange={(event) => handleSlugInputChange(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="form-input"
                style={{ flex: 1 }}
              />
            </div>
            {!isSlugAuto && suggestedSlug && suggestedSlug !== slugInput ? (
              <button
                type="button"
                onClick={handleUseSuggestedSlug}
                className="file-upload-button"
                style={{
                  whiteSpace: "nowrap",
                  marginTop: "8px",
                }}
              >
                {language === "en" ? "Use suggestion" : "ავტომატური ვარიანტი"}
              </button>
            ) : null}
            {slugMessage && (
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "0.85rem",
                  color: slugStatusColors[slugStatus],
                }}
              >
                {slugMessage}
              </p>
            )}
            {errors.artistSlug && (
              <span className="error-message">
                {errors.artistSlug.message || SLUG_VALIDATION_MESSAGE}
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
              onChange={(e) => {
                const iban = e.target.value.trim();
                const detectedBank = detectBankFromIban(iban);
                if (detectedBank) {
                  setValue("beneficiaryBankCode", detectedBank);
                } else if (iban.length >= 22) {
                  setValue("beneficiaryBankCode", "");
                }
              }}
            />
            {errors.accountNumber && (
              <span className="error-message">
                {t("profile.sellerAccountNumberRequired")}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="beneficiaryBankCode">
              {t("profile.bank")} *
            </label>
            <select
              id="beneficiaryBankCode"
              {...register("beneficiaryBankCode")}
              className="form-input"
              disabled={true}
            >
              <option value="">{t("profile.selectBank")}</option>
              {GEORGIAN_BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name} ({bank.nameEn})
                </option>
              ))}
            </select>
            {errors.beneficiaryBankCode && (
              <span className="error-message">
                {t("profile.bankRequired")}
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
