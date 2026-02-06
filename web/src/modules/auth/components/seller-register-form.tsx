"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sellerRegisterSchema } from "../validation/seller-register-schema";
import { useSellerRegister, useFacebookAuth } from "../hooks/use-auth";
import Link from "next/link";
import "./register-form.css";
import type * as z from "zod";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import { SellerContract } from "@/components/SellerContract";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import { trackCompleteRegistration } from "@/components/MetaPixel";
import { apiClient } from "@/lib/axios";
import { GEORGIAN_BANKS, detectBankFromIban } from "@/utils/georgian-banks";
import { FaGoogle } from "react-icons/fa";
import { FacebookAuthButton } from "@/components/auth/FacebookAuthButton";

type SellerRegisterFormData = z.infer<typeof sellerRegisterSchema>;

const SLUG_VALIDATION_MESSAGE =
  "სლაგი უნდა შედგებოდეს 3-40 სიმბოლოსგან (პატარა ლათინური ასოები, ციფრები და ჰიფენი)";

type SlugStatus = "idle" | "checking" | "available" | "taken" | "error";

export function SellerRegisterForm() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { mutate: register, isPending } = useSellerRegister();
  const { mutate: facebookAuth, isPending: isFacebookPending } = useFacebookAuth();
  const [registrationError, setRegistrationError] = useState<string | null>(
    null
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [contractAgreed, setContractAgreed] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const hasTrackedRegistrationRef = useRef(false);

  const {
    register: registerField,
    unregister,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SellerRegisterFormData>({
    resolver: zodResolver(sellerRegisterSchema),
  });

  useEffect(() => {
    registerField("artistSlug");
    return () => {
      unregister("artistSlug");
    };
  }, [registerField, unregister]);

  const storeNameValue = watch("storeName");

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

    const timeoutId = window.setTimeout(() => {
      ensureSuggestedSlug(currentValue);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
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

    const timeoutId = window.setTimeout(() => {
      checkSlugManually(trimmed, checkId);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [checkSlugManually, isSlugAuto, language, slugInput]);

  // Get referral code from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");
    if (refCode) {
      setReferralCode(refCode);
      setValue("invitationCode", refCode);
    }
  }, [setValue]);

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
    setRegistrationError(null);
    setPrivacyError(null);
    setContractError(null);
    setTermsError(null);

    // Check if privacy policy is agreed
    if (!privacyAgreed) {
      setPrivacyError(t("auth.privacyPolicyRequired"));
      return;
    }

    // Check if seller contract is agreed
    if (!contractAgreed) {
      setContractError(t("auth.sellerContractRequired"));
      return;
    }

    // Check if terms and conditions are agreed
    if (!termsAgreed) {
      setTermsError(t("auth.termsAndConditionsRequired"));
      return;
    }

    if (slugInput && slugStatus === "taken") {
      setRegistrationError(
        language === "en"
          ? "This public link is already taken. Please choose another."
          : "ეს საჯარო ბმული უკვე დაკავებულია. გთხოვთ, აირჩიოთ სხვა."
      );
      return;
    }

    if (slugInput && slugStatus === "checking") {
      setRegistrationError(
        language === "en"
          ? "Please wait until we finish checking your public link."
          : "დაელოდე, სანამ ბმულის შემოწმება დასრულდება."
      );
      return;
    }

    // Create FormData to handle file uploads
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

    const hasReferral = Boolean(data.invitationCode?.trim());
    const includedLogo = Boolean(fileInputRef.current?.files?.length);

    register(formData, {
      onSuccess: () => {
        setIsSuccess(true);
        resetSlugState();
        toast({
          title: t("auth.registrationSuccessful"),
          description: t("auth.sellerAccountCreatedSuccessfully"),
          variant: "default",
        });

        if (!hasTrackedRegistrationRef.current) {
          trackCompleteRegistration({
            registration_type: "seller",
            method: "email",
            hasReferral,
            uploadedLogo: includedLogo,
          });
          hasTrackedRegistrationRef.current = true;
        }

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      },
      onError: (error) => {
        // Display the error message directly from the backend
        const errorMessage = error.message;
        setRegistrationError(errorMessage);

        toast({
          title: t("auth.registrationFailed"),
          description: errorMessage,
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

  const handleGoogleAuth = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?sellerMode=true`;
  };

  const handleFacebookSuccess = (data: {
    accessToken: string;
    userId: string;
    email?: string;
    name: string;
    picture?: string;
  }) => {
    facebookAuth(data, {
      onSuccess: () => {
        setIsSuccess(true);
        toast({
          title: t("auth.registrationSuccessful"),
          description: t("auth.sellerAccountCreatedSuccessfully"),
          variant: "default",
        });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      },
      onError: (error) => {
        toast({
          title: t("auth.registrationFailed"),
          description: error.message,
          variant: "destructive",
        });
        setRegistrationError(error.message);
      },
    });
  };

  if (isSuccess) {
    return (
      <div className="form-container">
        <div className="success-message">
          <h3>{t("auth.registrationSuccessful")}</h3>
          <p>{t("auth.sellerAccountCreatedSuccessfully")}</p>
          <p>{t("auth.redirectingToLogin")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container" id="seller-register-form">
      <form onSubmit={onSubmit} className="form">
        {/* Social auth section */}
        <div className="social-auth-section" style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid #e0d5c8" }}>
          <p style={{ fontSize: "0.9rem", color: "#666", textAlign: "center", marginBottom: "1rem" }}>
            {language === "en"
              ? "Quick registration with social account"
              : "სწრაფი რეგისტრაცია სოციალური ქსელით"}
          </p>
          <div className="social-buttons">
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="social-btn google-btn"
            >
              <FaGoogle className="icon" />
              <span className="google-text">
                <span>G</span>
                <span>o</span>
                <span>o</span>
                <span>g</span>
                <span>l</span>
                <span>e</span>
              </span>
            </button>
            <FacebookAuthButton
              onSuccess={handleFacebookSuccess}
              onError={(error) => setRegistrationError(error)}
              disabled={isPending || isFacebookPending}
              variant="seller"
              className="social-btn"
            />
          </div>
          <div className="divider" style={{ margin: "1rem 0" }}>
            <span>{language === "en" ? "or fill in details" : "ან შეავსე ხელით"}</span>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="storeName">{t("auth.companyName")}</label>
          <input
            id="storeName"
            type="text"
            placeholder={t("auth.enterCompanyName")}
            {...registerField("storeName")}
          />
          {errors.storeName && (
            <p className="error-text">{errors.storeName.message}</p>
          )}
        </div>

        <div className="input-group">
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
            />
          </div>
          {!isSlugAuto && suggestedSlug && suggestedSlug !== slugInput ? (
            <button
              type="button"
              onClick={handleUseSuggestedSlug}
              className="logo-upload-button"
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
            <p className="error-text">
              {errors.artistSlug.message || SLUG_VALIDATION_MESSAGE}
            </p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="logoFile">{t("auth.uploadLogo")}</label>
          <div className="logo-upload-container">
            {logoPreview && (
              <div className="logo-preview">
                <Image
                  src={logoPreview}
                  alt={t("auth.logoPreview")}
                  width={100}
                  height={100}
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
              className="logo-upload-button"
            >
              {logoPreview ? t("auth.changeLogo") : t("auth.uploadLogo")}
            </button>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="ownerFirstName">{t("auth.firstName")}</label>
          <input
            id="ownerFirstName"
            type="text"
            placeholder={t("auth.enterFirstName")}
            {...registerField("ownerFirstName")}
          />
          {errors.ownerFirstName && (
            <p className="error-text">{errors.ownerFirstName.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="ownerLastName">{t("auth.lastName")}</label>
          <input
            id="ownerLastName"
            type="text"
            placeholder={t("auth.enterLastName")}
            {...registerField("ownerLastName")}
          />
          {errors.ownerLastName && (
            <p className="error-text">{errors.ownerLastName.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="phoneNumber">{t("auth.phoneNumber")}</label>
          <input
            id="phoneNumber"
            type="tel"
            placeholder="+995555123456"
            {...registerField("phoneNumber")}
          />
          {errors.phoneNumber && (
            <p className="error-text">{errors.phoneNumber.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="email">{t("auth.email")}</label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...registerField("email")}
          />
          {errors.email && <p className="error-text">{errors.email.message}</p>}
        </div>

        <div className="input-group">
          <label htmlFor="password">{t("auth.password")}</label>
          <input
            id="password"
            type="password"
            placeholder="********"
            {...registerField("password")}
          />
          {errors.password && (
            <p className="error-text">{errors.password.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="identificationNumber">{t("auth.idNumber")}</label>
          <input
            id="identificationNumber"
            type="text"
            placeholder={t("auth.enterIdNumber")}
            {...registerField("identificationNumber")}
          />
          {errors.identificationNumber && (
            <p className="error-text">{errors.identificationNumber.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="accountNumber">{t("auth.accountNumber")}</label>
          <input
            id="accountNumber"
            type="text"
            placeholder="GE29TB7777777777777777"
            {...registerField("accountNumber")}
            onChange={(event) => {
              const iban = event.target.value.trim();
              const detectedBank = detectBankFromIban(iban);

              if (detectedBank) {
                setValue("beneficiaryBankCode", detectedBank, {
                  shouldValidate: true,
                });
              } else if (iban.length >= 22) {
                setValue("beneficiaryBankCode", "", {
                  shouldValidate: true,
                });
              }
            }}
          />
          {errors.accountNumber && (
            <p className="error-text">{errors.accountNumber.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="beneficiaryBankCode">{t("profile.bank")}</label>
          <select
            id="beneficiaryBankCode"
            {...registerField("beneficiaryBankCode")}
            disabled
          >
            <option value="">{t("profile.selectBank")}</option>
            {GEORGIAN_BANKS.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name} ({bank.nameEn})
              </option>
            ))}
          </select>
          {errors.beneficiaryBankCode && (
            <p className="error-text">{errors.beneficiaryBankCode.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="invitationCode">{t("auth.referralCodeLabel")}</label>
          <input
            id="invitationCode"
            type="text"
            placeholder={t("auth.referralCodePlaceholder")}
            value={referralCode}
            onChange={(e) => {
              setReferralCode(e.target.value);
              setValue("invitationCode", e.target.value);
            }}
          />
          {errors.invitationCode && (
            <p className="error-text">{errors.invitationCode.message}</p>
          )}
        </div>

        {/* Enhanced error message display */}
        {registrationError && (
          <div className="error-message">
            <p className="error-text">{registrationError}</p>
          </div>
        )}

        {/* Privacy Policy Agreement */}
        <div className="privacy-policy-group">
          <label className="privacy-policy-label">
            <input
              type="checkbox"
              checked={privacyAgreed}
              onChange={(e) => setPrivacyAgreed(e.target.checked)}
              className="privacy-policy-checkbox"
            />
            <span className="privacy-policy-text">
              {t("auth.agreeToPrivacyPolicy")}{" "}
              <button
                type="button"
                onClick={() => setShowPrivacyPolicy(true)}
                className="contract-link"
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bff",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                {t("privacyPolicy.title")}
              </button>
            </span>
          </label>
          {privacyError && <p className="error-text">{privacyError}</p>}
        </div>

        {/* Seller Contract Agreement */}
        <div className="contract-policy-group">
          <label className="privacy-policy-label">
            <input
              type="checkbox"
              checked={contractAgreed}
              onChange={(e) => setContractAgreed(e.target.checked)}
              className="privacy-policy-checkbox"
            />
            <span className="privacy-policy-text">
              {t("auth.agreeToSellerContract")}{" "}
              <button
                type="button"
                onClick={() => setShowContract(true)}
                className="contract-link"
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bff",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                {t("auth.sellerContract")}
              </button>{" "}
              {t("auth.terms")}
            </span>
          </label>
          {contractError && <p className="error-text">{contractError}</p>}
        </div>

        {/* Terms and Conditions Agreement */}
        <div className="contract-policy-group">
          <label className="privacy-policy-label">
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              className="privacy-policy-checkbox"
            />
            <span className="privacy-policy-text">
              {t("auth.agreeToGeneralTerms")}{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="contract-link"
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bff",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                {t("auth.generalTermsAndConditions")}
              </button>{" "}
              {t("auth.provisions")}
            </span>
          </label>
          {termsError && <p className="error-text">{termsError}</p>}
        </div>

        {/* Contract Modal */}
        <SellerContract
          isOpen={showContract}
          onClose={() => setShowContract(false)}
          onAccept={() => {
            setContractAgreed(true);
            setShowContract(false);
          }}
          showAcceptButton={true}
        />

        {/* Terms and Conditions Modal */}
        <TermsAndConditions
          isOpen={showTerms}
          onClose={() => setShowTerms(false)}
          onAccept={() => {
            setTermsAgreed(true);
            setShowTerms(false);
          }}
          showAcceptButton={true}
        />

        {/* Privacy Policy Modal */}
        <PrivacyPolicy
          isOpen={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
          onAccept={() => {
            setPrivacyAgreed(true);
            setShowPrivacyPolicy(false);
          }}
          showAcceptButton={true}
        />

        <button
          type="submit"
          className={`submit-btn ${
            !privacyAgreed || !contractAgreed || !termsAgreed ? "disabled" : ""
          }`}
          disabled={
            isPending || !privacyAgreed || !contractAgreed || !termsAgreed
          }
        >
          {isPending ? t("auth.registering") : t("auth.register")}
        </button>

        <div className="text-center">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="login-link">
            {t("auth.login")}
          </Link>
        </div>
      </form>
    </div>
  );
}
