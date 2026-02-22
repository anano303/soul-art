"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useBecomeSeller } from "@/modules/auth/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import { GEORGIAN_BANKS, detectBankFromIban } from "@/utils/georgian-banks";
import { apiClient } from "@/lib/axios";
import { GoogleAuthPopup } from "@/components/auth/GoogleAuthPopup";
import { FacebookAuthButton } from "@/components/auth/FacebookAuthButton";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import { SellerContract } from "@/components/SellerContract";
import { FaCheckCircle } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import "./SellerRegistrationFlow.css";

// Step 1 Schema - Email/Password registration
const step1Schema = z.object({
  email: z.string().email("არასწორი ელფოსტა"),
  password: z.string().min(6, "პაროლი მინიმუმ 6 სიმბოლო"),
  name: z.string().min(1, "სახელი აუცილებელია"),
});

// Step 2 Schema - Seller details
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const step2Schema = z
  .object({
    storeName: z.string().min(1, "მაღაზიის სახელი აუცილებელია"),
    identificationNumber: z.string().min(1, "პირადი ნომერი აუცილებელია"),
    accountNumber: z.string().min(1, "საბანკო ანგარიში აუცილებელია"),
    beneficiaryBankCode: z.string().min(1, "ბანკი აუცილებელია"),
    phoneNumber: z
      .string()
      .min(1, "ტელეფონის ნომერი აუცილებელია")
      .regex(
        /^\+995\d{9}$/,
        "ტელეფონის ნომერი უნდა იყოს +995XXXXXXXXX ფორმატში (მაგ: +995555123456)",
      ),
    artistSlug: z
      .string()
      .optional()
      .transform((v) => (v ?? "").trim())
      .refine(
        (v) =>
          v === "" || (v.length >= 3 && v.length <= 40 && SLUG_PATTERN.test(v)),
        { message: "სლაგი უნდა შედგებოდეს 3-40 სიმბოლოსგან" },
      ),
  })
  .refine(
    (data) => {
      if (data.accountNumber?.trim()) {
        return detectBankFromIban(data.accountNumber.trim()) !== null;
      }
      return true;
    },
    { message: "არასწორი IBAN", path: ["accountNumber"] },
  );

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type SlugStatus = "idle" | "checking" | "available" | "taken" | "error";

interface SellerRegistrationFlowProps {
  onComplete?: () => void;
  redirectTo?: string;
  showLoginLink?: boolean;
  compact?: boolean;
}

export function SellerRegistrationFlow({
  onComplete,
  redirectTo = "/profile",
  showLoginLink = true,
  compact = false,
}: SellerRegistrationFlowProps) {
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { mutate: becomeSeller, isPending: becomeSellerPending } =
    useBecomeSeller();

  // Step state - if user is authenticated, skip to step 2
  const [step, setStep] = useState<1 | 2>(1);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pendingEmailData, setPendingEmailData] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);

  // Email verification state
  const [emailSent, setEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [emailValue, setEmailValue] = useState("");

  // Terms and conditions state
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showSellerContract, setShowSellerContract] = useState(false);

  // Step 2 state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slugInput, setSlugInput] = useState("");
  const [isSlugAuto, setIsSlugAuto] = useState(true);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const slugRequestIdRef = useRef(0);
  const manualCheckIdRef = useRef(0);

  const portfolioBaseUrl =
    process.env.NEXT_PUBLIC_WEBSITE_URL || "https://soulart.ge";
  const slugDisplayPrefix = `${portfolioBaseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}/@`;

  // Step 1 form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
  });

  // Step 2 form
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      phoneNumber: "",
      identificationNumber: "",
      accountNumber: "",
      beneficiaryBankCode: "",
      artistSlug: "",
    },
  });

  const storeNameValue = step2Form.watch("storeName");

  // Auto-advance to step 2 if user is authenticated
  useEffect(() => {
    if (!authLoading && user && step === 1) {
      // Check if already seller
      if (user.role === "seller") {
        if (onComplete) onComplete();
        else window.location.href = redirectTo;
        return;
      }
      setStep(2);
    }
  }, [user, authLoading, step, onComplete, redirectTo]);

  // Pre-fill user data in step 2
  useEffect(() => {
    if (user && step === 2) {
      if (user.phoneNumber) step2Form.setValue("phoneNumber", user.phoneNumber);
      if (user.identificationNumber)
        step2Form.setValue("identificationNumber", user.identificationNumber);
      if (user.accountNumber)
        step2Form.setValue("accountNumber", user.accountNumber);
      if (user.beneficiaryBankCode)
        step2Form.setValue("beneficiaryBankCode", user.beneficiaryBankCode);
    }
  }, [user, step, step2Form]);

  // Register artistSlug field
  useEffect(() => {
    step2Form.register("artistSlug");
    return () => step2Form.unregister("artistSlug");
  }, [step2Form]);

  // Slug helpers
  const setSlugValue = useCallback(
    (value: string, options?: { validate?: boolean; markDirty?: boolean }) => {
      setSlugInput(value);
      step2Form.setValue("artistSlug", value, {
        shouldDirty: options?.markDirty ?? true,
        shouldValidate: options?.validate ?? true,
      });
    },
    [step2Form],
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
      return base.length >= 3
        ? base
        : base.length > 0
          ? `${base}-${Date.now().toString().slice(-2)}`
          : "artist";
    },
    [slugify],
  );

  const ensureSuggestedSlug = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        slugRequestIdRef.current += 1;
        setSlugStatus("idle");
        setSlugMessage("");
        setSlugValue("", { validate: true, markDirty: false });
        return;
      }

      const baseCandidate = buildAutoSlug(trimmed);
      const requestId = ++slugRequestIdRef.current;

      setSlugStatus("checking");
      setSlugMessage(language === "en" ? "Checking..." : "მოწმდება...");

      try {
        let attempt = 0;
        let candidate = baseCandidate;

        while (true) {
          const { data } = await apiClient.get("/artists/slug/check", {
            params: { slug: candidate },
          });
          if (slugRequestIdRef.current !== requestId) return;

          if (data.available) {
            setSlugValue(candidate, { validate: true });
            setSlugStatus("available");
            setSlugMessage(
              language === "en"
                ? `${candidate} is available`
                : `${candidate} თავისუფალია`,
            );
            return;
          }

          attempt += 1;
          if (attempt > 99) throw new Error("No slug");
          candidate = `${baseCandidate}-${attempt}`;
        }
      } catch {
        if (slugRequestIdRef.current !== requestId) return;
        setSlugValue(baseCandidate, { validate: true });
        setSlugStatus("error");
        setSlugMessage(
          language === "en" ? "Couldn't verify" : "შემოწმება ვერ მოხერხდა",
        );
      }
    },
    [buildAutoSlug, language, setSlugValue],
  );

  const checkSlugManually = useCallback(
    async (slug: string, checkId: number) => {
      if (!slug) return;
      try {
        const { data } = await apiClient.get("/artists/slug/check", {
          params: { slug },
        });
        if (manualCheckIdRef.current !== checkId) return;

        if (data.available) {
          setSlugStatus("available");
          setSlugMessage(language === "en" ? "Available" : "თავისუფალია");
        } else {
          setSlugStatus("taken");
          setSlugMessage(language === "en" ? "Taken" : "დაკავებულია");
        }
      } catch {
        if (manualCheckIdRef.current !== checkId) return;
        setSlugStatus("error");
        setSlugMessage(language === "en" ? "Check failed" : "შეცდომა");
      }
    },
    [language],
  );

  const handleSlugInputChange = useCallback(
    (raw: string) => {
      const sanitized = slugify(raw).slice(0, 40);
      setIsSlugAuto(false);
      slugRequestIdRef.current += 1;
      setSlugValue(sanitized, { validate: true });
      if (!sanitized) {
        setSlugStatus("idle");
        setSlugMessage("");
      }
    },
    [setSlugValue, slugify],
  );

  // Auto-generate slug from store name
  useEffect(() => {
    if (!isSlugAuto || step !== 2) return;
    const currentValue = storeNameValue ?? "";
    if (!currentValue.trim()) {
      ensureSuggestedSlug(currentValue);
      return;
    }
    const timeoutId = setTimeout(() => ensureSuggestedSlug(currentValue), 300);
    return () => clearTimeout(timeoutId);
  }, [ensureSuggestedSlug, isSlugAuto, storeNameValue, step]);

  // Manual slug check
  useEffect(() => {
    if (isSlugAuto || step !== 2) return;
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
      setSlugMessage(language === "en" ? "Min 3 chars" : "მინ. 3 სიმბოლო");
      return;
    }

    setSlugStatus("checking");
    const timeoutId = setTimeout(
      () => checkSlugManually(trimmed, checkId),
      400,
    );
    return () => clearTimeout(timeoutId);
  }, [checkSlugManually, isSlugAuto, language, slugInput, step]);

  // Handlers
  const handleGoogleSuccess = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      // Fetch user profile to store in localStorage (cookies were set by server)
      const response = await apiClient.get("/auth/profile");
      if (response.data) {
        // Store user data in localStorage so isLoggedIn() returns true
        const { storeUserData } = await import("@/lib/auth");
        storeUserData(response.data);
        // Invalidate query to refresh React Query cache
        await queryClient.invalidateQueries({ queryKey: ["user"] });
        // Force advance to step 2
        if (response.data.role === "seller") {
          if (onComplete) onComplete();
          else window.location.href = redirectTo;
        } else {
          setStep(2);
        }
      }
    } catch (err) {
      console.error("Error fetching user after Google auth:", err);
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description:
          language === "en"
            ? "Authentication failed"
            : "ავტორიზაცია ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  }, [queryClient, language, onComplete, redirectTo]);

  const handleFacebookSuccess = useCallback(
    async (data: {
      accessToken: string;
      userId: string;
      email?: string;
      name: string;
      picture?: string;
    }) => {
      setIsAuthenticating(true);
      try {
        // Call backend to verify FB token and create session
        await apiClient.post("/auth/facebook/token", data);
        // Fetch user profile to store in localStorage
        const response = await apiClient.get("/auth/profile");
        if (response.data) {
          const { storeUserData } = await import("@/lib/auth");
          storeUserData(response.data);
          await queryClient.invalidateQueries({ queryKey: ["user"] });
          // Force advance to step 2 or complete
          if (response.data.role === "seller") {
            if (onComplete) onComplete();
            else window.location.href = redirectTo;
          } else {
            setStep(2);
          }
        }
      } catch (err) {
        toast({
          title: language === "en" ? "Error" : "შეცდომა",
          description: (err as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsAuthenticating(false);
      }
    },
    [queryClient, language, onComplete, redirectTo],
  );

  // Email verification handlers
  const sendVerificationEmail = async () => {
    if (!emailValue) return;
    setVerificationError("");
    try {
      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      if (res.ok) {
        setEmailSent(true);
      } else {
        setVerificationError(
          language === "en"
            ? "Failed to send code"
            : "კოდის გაგზავნა ვერ მოხერხდა",
        );
      }
    } catch {
      setVerificationError(
        language === "en"
          ? "Failed to send code"
          : "კოდის გაგზავნა ვერ მოხერხდა",
      );
    }
  };

  const verifyEmailCode = async () => {
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, code: verificationCode }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEmailVerified(true);
        setVerificationError("");
      } else {
        setVerificationError(
          language === "en" ? "Invalid code" : "არასწორი კოდი",
        );
      }
    } catch {
      setVerificationError(
        language === "en" ? "Verification failed" : "შემოწმება ვერ მოხერხდა",
      );
    }
  };

  const resendVerificationCode = () => {
    setVerificationCode("");
    setEmailSent(false);
    setVerificationError("");
    sendVerificationEmail();
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setLogoPreview(e.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onStep1Submit = step1Form.handleSubmit((data) => {
    if (!isEmailVerified) {
      setVerificationError(
        language === "en"
          ? "Please verify your email first"
          : "გთხოვთ, ჯერ დაადასტუროთ ელფოსტა",
      );
      return;
    }
    // Store email/password data for complete registration in step 2
    setPendingEmailData(data);
    setStep(2);
  });

  const onStep2Submit = step2Form.handleSubmit(async (data) => {
    const formData = new FormData();

    // If we have pending email data (new user via email), use full seller register
    if (pendingEmailData) {
      formData.append("email", pendingEmailData.email);
      formData.append("password", pendingEmailData.password);
      const nameParts = pendingEmailData.name.split(" ");
      formData.append("ownerFirstName", nameParts[0] || pendingEmailData.name);
      formData.append("ownerLastName", nameParts.slice(1).join(" ") || "");
    }

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        formData.append(key, value as string);
      }
    });

    if (fileInputRef.current?.files?.length) {
      formData.append("logoFile", fileInputRef.current.files[0]);
    }

    // If existing user (OAuth or already logged in), use becomeSeller
    // Otherwise use full seller registration
    if (pendingEmailData) {
      // New user via email - need to create account + seller
      setIsAuthenticating(true);
      try {
        await apiClient.post("/auth/sellers-register", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setIsAuthenticating(false);
        toast({
          title: language === "en" ? "Success!" : "წარმატება!",
          description:
            language === "en"
              ? "Account created! Please verify your email."
              : "ანგარიში შეიქმნა! გთხოვთ დაადასტუროთ ელფოსტა.",
          variant: "default",
        });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        if (onComplete) onComplete();
        else window.location.href = redirectTo;
      } catch (error: unknown) {
        setIsAuthenticating(false);
        const errMsg =
          error instanceof Error
            ? error.message
            : (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message || "Unknown error";
        toast({
          title: language === "en" ? "Error" : "შეცდომა",
          description: errMsg,
          variant: "destructive",
        });
      }
    } else {
      // Existing user - just become seller
      becomeSeller(formData, {
        onSuccess: () => {
          toast({
            title: language === "en" ? "Success!" : "წარმატება!",
            description:
              language === "en"
                ? "You are now a seller"
                : "შენ ახლა გამყიდველი ხარ",
            variant: "default",
          });
          queryClient.invalidateQueries({ queryKey: ["user"] });
          if (onComplete) onComplete();
          else window.location.href = redirectTo;
        },
        onError: (error) => {
          toast({
            title: language === "en" ? "Error" : "შეცდომა",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    }
  });

  const slugStatusColors: Record<SlugStatus, string> = {
    idle: "#6b7280",
    checking: "#2563eb",
    available: "#15803d",
    taken: "#b91c1c",
    error: "#b45309",
  };

  const isPending = becomeSellerPending || isAuthenticating;

  if (authLoading) {
    return (
      <div className="srf-loading">
        {language === "en" ? "Loading..." : "იტვირთება..."}
      </div>
    );
  }

  return (
    <div className={`seller-registration-flow ${compact ? "compact" : ""}`}>
      {/* Step indicator */}
      <div className="srf-step-indicator">
        <div
          className={`srf-step ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}
        >
          {step > 1 ? "✓" : "1"}
        </div>
        <div className="srf-step-line" />
        <div className={`srf-step ${step >= 2 ? "active" : ""}`}>2</div>
      </div>

      {step === 1 && (
        <div className="srf-step-content">
          <h2 className="srf-title">
            {language === "en" ? "Create Your Account" : "შექმენი ანგარიში"}
          </h2>
          <p className="srf-subtitle">
            {language === "en"
              ? "Sign in with social account or create new"
              : "შედი სოციალური ქსელით ან შექმენი ახალი"}
          </p>

          {/* Social buttons */}
          <div className="srf-social-buttons">
            <GoogleAuthPopup
              onSuccess={handleGoogleSuccess}
              onError={(err) =>
                toast({
                  title: "Error",
                  description: err,
                  variant: "destructive",
                })
              }
              sellerMode={true}
              disabled={isPending}
            />
            <FacebookAuthButton
              onSuccess={handleFacebookSuccess}
              onError={(err) =>
                toast({
                  title: "Error",
                  description: err,
                  variant: "destructive",
                })
              }
              variant="seller"
              disabled={isPending}
            />
          </div>

          <div className="srf-divider">
            <span>{language === "en" ? "or with email" : "ან ელფოსტით"}</span>
          </div>

          {/* Email form */}
          <form onSubmit={onStep1Submit} className="srf-form">
            <div className="srf-form-group">
              <label htmlFor="name">
                {language === "en" ? "Full Name" : "სახელი და გვარი"}
              </label>
              <input
                id="name"
                type="text"
                placeholder={language === "en" ? "Your name" : "შენი სახელი"}
                {...step1Form.register("name")}
                className="srf-input"
              />
              {step1Form.formState.errors.name && (
                <span className="srf-error">
                  {step1Form.formState.errors.name.message}
                </span>
              )}
            </div>

            <div className="srf-form-group">
              <label htmlFor="email">
                {language === "en" ? "Email" : "ელფოსტა"}
              </label>
              <div className="srf-email-container">
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  disabled={isEmailVerified}
                  className={`srf-input ${isEmailVerified ? "srf-verified-input" : ""}`}
                  {...step1Form.register("email", {
                    onChange: (e) =>
                      !isEmailVerified && setEmailValue(e.target.value),
                  })}
                />
                {isEmailVerified && (
                  <FaCheckCircle className="srf-verified-icon" />
                )}
              </div>
              {step1Form.formState.errors.email && (
                <span className="srf-error">
                  {step1Form.formState.errors.email.message}
                </span>
              )}
              {emailValue && !emailSent && !isEmailVerified && (
                <button
                  type="button"
                  onClick={sendVerificationEmail}
                  className="srf-verify-btn"
                >
                  {language === "en" ? "Send Code" : "გაგზავნე კოდი"}
                </button>
              )}
            </div>

            {emailSent && !isEmailVerified && (
              <div className="srf-form-group">
                <label htmlFor="verification-code">
                  {language === "en"
                    ? "Verification Code"
                    : "ვერიფიკაციის კოდი"}
                </label>
                <input
                  id="verification-code"
                  type="text"
                  placeholder={
                    language === "en" ? "Enter code" : "შეიყვანე კოდი"
                  }
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="srf-input"
                />
                <button
                  type="button"
                  onClick={verifyEmailCode}
                  className="srf-verify-btn"
                >
                  {language === "en" ? "Verify" : "დადასტურება"}
                </button>
                {verificationError && (
                  <>
                    <span className="srf-error">{verificationError}</span>
                    <button
                      type="button"
                      onClick={resendVerificationCode}
                      className="srf-resend-btn"
                    >
                      {language === "en" ? "Resend Code" : "ხელახლა გაგზავნა"}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="srf-form-group">
              <label htmlFor="password">
                {language === "en" ? "Password" : "პაროლი"}
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...step1Form.register("password")}
                className="srf-input"
              />
              {step1Form.formState.errors.password && (
                <span className="srf-error">
                  {step1Form.formState.errors.password.message}
                </span>
              )}
            </div>

            {verificationError && !emailSent && (
              <span className="srf-error">{verificationError}</span>
            )}

            <p className="srf-terms-notice">
              {t("auth.agreeToTermsAndConditions")}{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="srf-contract-link"
              >
                {t("auth.termsAndConditions")}
              </button>{" "}
              {t("auth.and")}{" "}
              <button
                type="button"
                onClick={() => setShowPrivacyPolicy(true)}
                className="srf-contract-link"
              >
                {t("auth.privacyPolicy")}
              </button>
            </p>

            {/* Terms and Conditions Modal */}
            <TermsAndConditions
              isOpen={showTerms}
              onClose={() => setShowTerms(false)}
              showAcceptButton={false}
            />

            {/* Privacy Policy Modal */}
            <PrivacyPolicy
              isOpen={showPrivacyPolicy}
              onClose={() => setShowPrivacyPolicy(false)}
              showAcceptButton={false}
            />

            <button
              type="submit"
              className="srf-submit-btn"
              disabled={isPending || !isEmailVerified}
            >
              {language === "en" ? "Continue" : "გაგრძელება"}
            </button>
          </form>

          {showLoginLink && (
            <p className="srf-login-link">
              {language === "en"
                ? "Already have an account?"
                : "უკვე გაქვს ანგარიში?"}{" "}
              <Link href="/login">
                {language === "en" ? "Log in" : "შესვლა"}
              </Link>
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="srf-step-content">
          <h2 className="srf-title">
            {language === "en"
              ? "Complete Your Seller Profile"
              : "შეავსე გამყიდველის პროფილი"}
          </h2>
          {user && (
            <p className="srf-subtitle">
              {language === "en"
                ? `Welcome, ${user.name || user.email}!`
                : `გამარჯობა, ${user.name || user.email}!`}
            </p>
          )}

          <form onSubmit={onStep2Submit} className="srf-form">
            <div className="srf-form-group">
              <label htmlFor="storeName">
                {language === "en"
                  ? "Store / Author Name (displayed on site)"
                  : "მაღაზიის ან ავტორის სახელი (რაც გამოჩნდება საიტზე)"}{" "}
                *
              </label>
              <input
                id="storeName"
                type="text"
                placeholder={
                  language === "en"
                    ? "e.g. Art Studio / John Doe"
                    : "მაგ: ხელოვნების სტუდია / გიორგი გიორგაძე"
                }
                {...step2Form.register("storeName")}
                className="srf-input"
              />
              {step2Form.formState.errors.storeName && (
                <span className="srf-error">
                  {step2Form.formState.errors.storeName.message}
                </span>
              )}
            </div>

            <div className="srf-form-group">
              <label>
                {language === "en" ? "Portfolio Link" : "პორტფოლიოს ბმული"}
              </label>
              <div className="srf-slug-wrapper">
                <span className="srf-slug-prefix">{slugDisplayPrefix}</span>
                <input
                  type="text"
                  value={slugInput}
                  onChange={(e) => handleSlugInputChange(e.target.value)}
                  className="srf-slug-input"
                />
              </div>
              {slugMessage && (
                <span
                  style={{
                    color: slugStatusColors[slugStatus],
                    fontSize: "0.85rem",
                  }}
                >
                  {slugMessage}
                </span>
              )}
            </div>

            <div className="srf-form-group">
              <label>
                {language === "en"
                  ? "Your Brand Image"
                  : "თქვენი ბრენდის სურათი"}
              </label>
              <div
                className={`srf-logo-dropzone ${logoPreview ? "has-preview" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    fileInputRef.current?.click();
                }}
              >
                {logoPreview ? (
                  <div className="srf-logo-preview-wrapper">
                    <Image
                      src={logoPreview}
                      alt="Logo"
                      width={80}
                      height={80}
                      className="srf-logo-preview"
                    />
                    <div className="srf-logo-overlay">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span>{language === "en" ? "Change" : "შეცვლა"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="srf-logo-placeholder">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="srf-logo-placeholder-text">
                      {language === "en"
                        ? "Upload your photo or logo"
                        : "ატვირთეთ თქვენი ფოტო ან ლოგო"}
                    </span>
                    <span className="srf-logo-placeholder-hint">
                      {language === "en"
                        ? "This will be displayed on your profile"
                        : "ეს გამოჩნდება საიტზე თქვენს პროფილზე"}
                    </span>
                    <span className="srf-logo-placeholder-hint">
                      PNG, JPG, WEBP (მაქს. 5MB)
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            <div className="srf-form-row">
              <div className="srf-form-group">
                <label htmlFor="phoneNumber">
                  {language === "en" ? "Phone" : "ტელეფონი"} *
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+995555123456"
                  {...step2Form.register("phoneNumber")}
                  className="srf-input"
                />
                {step2Form.formState.errors.phoneNumber && (
                  <span className="srf-error">
                    {step2Form.formState.errors.phoneNumber.message}
                  </span>
                )}
              </div>

              <div className="srf-form-group">
                <label htmlFor="identificationNumber">
                  {language === "en" ? "ID Number" : "პირადი ნომერი"} *
                </label>
                <input
                  id="identificationNumber"
                  type="text"
                  {...step2Form.register("identificationNumber")}
                  className="srf-input"
                />
                {step2Form.formState.errors.identificationNumber && (
                  <span className="srf-error">
                    {step2Form.formState.errors.identificationNumber.message}
                  </span>
                )}
              </div>
            </div>

            <div className="srf-form-row">
              <div className="srf-form-group">
                <label htmlFor="accountNumber">IBAN *</label>
                <input
                  id="accountNumber"
                  type="text"
                  placeholder="GE29TB..."
                  {...step2Form.register("accountNumber")}
                  className="srf-input"
                  onChange={(e) => {
                    const iban = e.target.value.trim();
                    const bank = detectBankFromIban(iban);
                    if (bank) step2Form.setValue("beneficiaryBankCode", bank);
                    else if (iban.length >= 22)
                      step2Form.setValue("beneficiaryBankCode", "");
                  }}
                />
                {step2Form.formState.errors.accountNumber && (
                  <span className="srf-error">
                    {step2Form.formState.errors.accountNumber.message}
                  </span>
                )}
              </div>

              <div className="srf-form-group">
                <label htmlFor="beneficiaryBankCode">
                  {language === "en" ? "Bank" : "ბანკი"} *
                </label>
                <select
                  id="beneficiaryBankCode"
                  {...step2Form.register("beneficiaryBankCode")}
                  className="srf-input"
                  disabled
                >
                  <option value="">
                    {language === "en" ? "Select" : "აირჩიე"}
                  </option>
                  {GEORGIAN_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                {step2Form.formState.errors.beneficiaryBankCode && (
                  <span className="srf-error">
                    {step2Form.formState.errors.beneficiaryBankCode.message}
                  </span>
                )}
              </div>
            </div>

            <p className="srf-terms-notice">
              {language === "en"
                ? "By completing registration, you agree to the"
                : "რეგისტრაციის დასრულებით ეთანხმებით"}{" "}
              <button
                type="button"
                onClick={() => setShowSellerContract(true)}
                className="srf-contract-link"
              >
                {language === "en"
                  ? "Seller Agreement"
                  : "გამყიდველის ხელშეკრულებას"}
              </button>
            </p>

            {/* Seller Contract Modal */}
            <SellerContract
              isOpen={showSellerContract}
              onClose={() => setShowSellerContract(false)}
              showAcceptButton={false}
            />

            <button
              type="submit"
              className="srf-submit-btn"
              disabled={isPending}
            >
              {isPending
                ? language === "en"
                  ? "Submitting..."
                  : "იგზავნება..."
                : language === "en"
                  ? "Complete Registration"
                  : "დაასრულე რეგისტრაცია"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
