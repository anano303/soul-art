"use client";

import { FaCheckCircle, FaGoogle } from "react-icons/fa";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "../validation";
import { useRegister } from "../hooks/use-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import "./register-form.css";
import type * as z from "zod";
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/LanguageContext";

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const { mutate: register, isPending } = useRegister();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const [emailSent, setEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [canSendEmail, setCanSendEmail] = useState(false);

  useEffect(() => {
    setCanSendEmail(email.trim().length > 0);
  }, [email]);

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
    setErrorMessage("");

    register(data, {
      onSuccess: () => {
        setIsSuccess(true);
        toast({
          title: t("auth.registrationSuccessful"),
          description: t("auth.accountCreatedSuccessfully"),
          variant: "default",
        });

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      },
      onError: (error) => {
        // Display the error from the backend
        const errorMessage = error.message;
        setRegisterError(errorMessage);

        toast({
          title: t("auth.registrationFailed"),
          description: errorMessage,
          variant: "destructive",
        });
      },
    });
  };

  const handleGoogleAuth = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
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

        {registerError && (
          <div className="error-message">
            <p className="error-text">{registerError}</p>
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={isPending || !isVerified}
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
        </div>

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
