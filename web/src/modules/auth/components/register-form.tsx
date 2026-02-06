"use client";

import { FaCheckCircle, FaGoogle } from "react-icons/fa";
import { FacebookAuthButton } from "@/components/auth/FacebookAuthButton";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "../validation";
import { useRegister, useFacebookAuth } from "../hooks/use-auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/use-error-handler";
import "./register-form.css";
import type * as z from "zod";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import { trackCompleteRegistration } from "@/components/MetaPixel";
import { trackRegistration as trackSalesRegistration } from "@/hooks/use-sales-tracking";

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { t } = useLanguage();
  const errorHandler = useErrorHandler();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: register, isPending } = useRegister();
  const { mutate: facebookAuth, isPending: isFacebookPending } = useFacebookAuth();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const [emailSent, setEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [canSendEmail, setCanSendEmail] = useState(false);
  const hasTrackedRegistrationRef = useRef(false);

  useEffect(() => {
    setCanSendEmail(email.trim().length > 0);
  }, [email]);

  // Auto-fill referral code from URL parameters
  useEffect(() => {
    if (searchParams) {
      const refCode = searchParams.get("ref");
      if (refCode) {
        setValue("invitationCode", refCode);
      }
    }
  }, [searchParams, setValue]);

  const sendVerificationEmail = async () => {
    if (!email) return;
    const res = await fetch("/api/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setEmailSent(true);
      setErrorMessage(""); // Clear any previous errors
    }
  };

  const verifyCode = async () => {
    const res = await fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: verificationCode }),
    });
    const data = await res.json();
    if (data.success) {
      setIsVerified(true);
      setErrorMessage("");
    } else {
      setErrorMessage(t("auth.invalidVerificationCode"));
    }
  };

  const resendCode = () => {
    setVerificationCode("");
    setEmailSent(false);
    setErrorMessage("");
    sendVerificationEmail();
  };

  const onSubmit: SubmitHandler<RegisterFormData> = async (data) => {
    setRegisterError(null);
    if (!isVerified) {
      setErrorMessage(t("auth.pleaseVerifyEmail"));
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage(t("auth.pleaseAgreeToTerms"));
      return;
    }
    setErrorMessage("");

    const hasReferral = Boolean(data.invitationCode?.trim());

    register(data, {
      onSuccess: () => {
        setIsSuccess(true);
        toast({
          title: t("auth.registrationSuccessful"),
          description: t("auth.accountCreatedSuccessfully"),
          variant: "default",
        });

        if (!hasTrackedRegistrationRef.current) {
          trackCompleteRegistration({
            registration_type: "customer",
            method: "email",
            hasReferral,
          });
          // Track Sales Manager referral registration
          trackSalesRegistration("", data.email);
          hasTrackedRegistrationRef.current = true;
        }

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      },
      onError: (error) => {
        errorHandler.showToast(error, t("auth.registrationFailed"));
        setRegisterError(errorHandler.handle(error).message);
      },
    });
  };

  const handleGoogleAuth = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
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
          description: t("auth.accountCreatedSuccessfully"),
          variant: "default",
        });
        setTimeout(() => {
          router.push("/");
        }, 1000);
      },
      onError: (error) => {
        errorHandler.showToast(error, t("auth.registrationFailed"));
        setRegisterError(errorHandler.handle(error).message);
      },
    });
  };

  if (isSuccess) {
    return (
      <div className="form-container">
        <div className="success-message">
          <h3>{t("auth.registrationSuccessful")}</h3>
          <p>{t("auth.accountCreatedSuccessfully")}</p>
          <p>{t("auth.redirectingToLogin")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <div className="input-group">
          <label htmlFor="name">{t("auth.fullName")}</label>
          <input
            id="name"
            type="text"
            placeholder={t("auth.enterName")}
            {...registerField("name")}
          />
          {errors.name && <p className="error-text">{errors.name.message}</p>}
        </div>

        <div className="input-group">
          <label htmlFor="email">{t("auth.email")}</label>
          <div className="email-container">
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              disabled={isVerified} // Disable the input if email is verified
              className={isVerified ? "verified-input" : ""} // Add a class for styling
              {...registerField("email", {
                onChange: (e) => !isVerified && setEmail(e.target.value), // Only update email if not verified
              })}
            />
            {isVerified && <FaCheckCircle className="verified-icon" />}
          </div>
          {errors.email && <p className="error-text">{errors.email.message}</p>}

          {canSendEmail && !emailSent && !isVerified && (
            <button
              className="verifBtn"
              type="button"
              onClick={sendVerificationEmail}
            >
              {t("auth.sendVerificationCode")}
            </button>
          )}
        </div>

        {emailSent && !isVerified && (
          <div className="input-group">
            <label htmlFor="verification-code">
              {t("auth.verificationCode")}
            </label>
            <input
              id="verification-code"
              type="text"
              placeholder={t("auth.enterCode")}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
            <button className="verifBtn" type="button" onClick={verifyCode}>
              {t("auth.verify")}
            </button>
            {errorMessage && <p className="error-text">{errorMessage}</p>}
            {errorMessage && (
              <button className="verifBtn" type="button" onClick={resendCode}>
                {t("auth.resendCode")}
              </button>
            )}
          </div>
        )}

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
          <label htmlFor="invitationCode">
            {t("auth.referralCodeOptional")}
          </label>
          <input
            id="invitationCode"
            type="text"
            placeholder="ABC12345"
            {...registerField("invitationCode")}
          />
          {errors.invitationCode && (
            <p className="error-text">{errors.invitationCode.message}</p>
          )}
          <p className="input-hint">{t("auth.referralCodeHint")}</p>
        </div>

        {registerError && (
          <div className="error-message">
            <p className="error-text">{registerError}</p>
          </div>
        )}

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="checkbox-input checkbox"
            />
            <span className="checkbox-text">
              {t("auth.agreeToTermsAndConditions")}{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="contract-link"
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bff",
                  textDecoration: "none",
                  cursor: "pointer",
                  font: "inherit",
                  padding: 0,
                }}
              >
                {t("auth.termsAndConditions")}
              </button>{" "}
              {t("auth.and")}{" "}
              <button
                type="button"
                onClick={() => setShowPrivacyPolicy(true)}
                className="contract-link"
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bff",
                  textDecoration: "none",
                  cursor: "pointer",
                  font: "inherit",
                  padding: 0,
                }}
              >
                {t("auth.privacyPolicy")}
              </button>
            </span>
          </label>
        </div>

        {/* Terms and Conditions Modal */}
        <TermsAndConditions
          isOpen={showTerms}
          onClose={() => setShowTerms(false)}
          onAccept={() => {
            setAgreedToTerms(true);
            setShowTerms(false);
          }}
          showAcceptButton={true}
        />

        {/* Privacy Policy Modal */}
        <PrivacyPolicy
          isOpen={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
          showAcceptButton={false}
        />

        <button
          type="submit"
          className="submit-btn"
          disabled={isPending || !isVerified || !agreedToTerms}
        >
          {isPending ? t("auth.creatingAccount") : t("auth.createAccount")}
        </button>

        <div className="divider">
          <span>{t("auth.orContinueWith")}</span>
        </div>

        <div className="social-buttons">
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="social-btn google-btn"
            disabled={isPending}
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
            onError={(error) => setRegisterError(error)}
            disabled={isPending || isFacebookPending}
            variant="register"
            className="social-btn"
          />
        </div>

        <div className="text-center">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="login-link">
            {t("auth.login")}
          </Link>
        </div>

        <div className="text-center special-text-links">
          <Link href="/sellers-register" className="login-link">
            {t("auth.becomeSeller")}
          </Link>
          {" | "}
          <Link href="/sales-manager-register" className="login-link">
            {t("auth.forInfluencers")}
          </Link>
        </div>
      </form>
    </div>
  );
}
