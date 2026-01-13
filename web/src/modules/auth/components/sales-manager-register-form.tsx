"use client";

import { FaCheckCircle } from "react-icons/fa";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSalesManagerRegister } from "../hooks/use-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/use-error-handler";
import "./register-form.css";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import { SalesManagerContract } from "@/components/SalesManagerContract";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { z } from "zod";
import { getBankByIban, detectBankFromIban } from "@/utils/georgian-banks";

const salesManagerRegisterSchema = z
  .object({
    name: z
      .string()
      .min(4, "სახელი ძალიან მოკლეა")
      .max(50, "სახელი ძალიან გრძელია"),
    email: z.string().email("არასწორი ელ-ფოსტა"),
    password: z
      .string()
      .min(5, "პაროლი ძალიან მოკლეა")
      .max(20, "პაროლი ძალიან გრძელია"),
    confirmPassword: z.string(),
    phone: z.string().min(9, "ტელეფონის ნომერი ძალიან მოკლეა"),
    personalId: z
      .string()
      .regex(/^\d{11}$/, "პირადი ნომერი უნდა შეიცავდეს 11 ციფრს"),
    bankAccount: z
      .string()
      .regex(/^GE\d{2}[A-Z]{2}\d{16}$/, "IBAN ფორმატი არასწორია"),
    bankName: z.string().min(1, "აირჩიეთ ბანკი"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "პაროლები არ ემთხვევა",
    path: ["confirmPassword"],
  });

type SalesManagerFormData = z.infer<typeof salesManagerRegisterSchema>;

export function SalesManagerRegisterForm() {
  const { t } = useLanguage();
  const errorHandler = useErrorHandler();
  const router = useRouter();
  const { mutate: register, isPending } = useSalesManagerRegister();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsAndConditions, setShowTermsAndConditions] = useState(false);
  const [agreedToPartnership, setAgreedToPartnership] = useState(false);
  const [showPartnershipContract, setShowPartnershipContract] = useState(false);

  const [emailSent, setEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [canSendEmail, setCanSendEmail] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SalesManagerFormData>({
    resolver: zodResolver(salesManagerRegisterSchema),
  });

  const bankAccountValue = watch("bankAccount");

  useEffect(() => {
    setCanSendEmail(email.trim().length > 0);
  }, [email]);

  // Auto-detect bank from IBAN
  useEffect(() => {
    if (bankAccountValue && bankAccountValue.length >= 6) {
      const detectedBank = getBankByIban(bankAccountValue);
      if (detectedBank) {
        setValue("bankName", detectedBank.name);
      }
    }
  }, [bankAccountValue, setValue]);

  const sendVerificationEmail = async () => {
    if (!email) return;
    const res = await fetch("/api/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setEmailSent(true);
      setErrorMessage("");
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

  const onSubmit: SubmitHandler<SalesManagerFormData> = async (data) => {
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

    const submitData = {
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      personalId: data.personalId,
      bankAccount: data.bankAccount,
      bankName: data.bankName,
    };

    // შევინახოთ credentials რეგისტრაციამდე
    const savedEmail = data.email;
    const savedPassword = data.password;

    register(submitData, {
      onSuccess: (response) => {
        setIsSuccess(true);
        toast({
          title: t("auth.registrationSuccessful"),
          description: t("auth.salesManagerAccountCreated"),
          variant: "default",
        });

        // Login გვერდზე გადავიყვანოთ credentials-ებით
        setTimeout(() => {
          const params = new URLSearchParams({
            email: savedEmail,
            password: savedPassword,
            registered: 'true',
          });
          router.push(`/login?${params.toString()}`);
        }, 2000);
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
          <FaCheckCircle className="success-icon" />
          <h2>{t("auth.registrationSuccessful")}</h2>
          <p>{t("auth.salesManagerAccountCreated")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        {registerError && <p className="error-message">{registerError}</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {/* Name */}
        <div className="input-group">
          <label htmlFor="name">{t("auth.fullName")}</label>
          <input
            id="name"
            type="text"
            {...registerField("name")}
            placeholder={t("auth.enterName")}
          />
          {errors.name && (
            <span className="error-text">{errors.name.message}</span>
          )}
        </div>

        {/* Email with verification */}
        <div className="input-group">
          <label htmlFor="email">{t("auth.email")}</label>
          <div className="email-container">
            <input
              id="email"
              type="email"
              {...registerField("email")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                registerField("email").onChange(e);
              }}
              placeholder="name@example.com"
              disabled={isVerified}
              className={isVerified ? "verified-input" : ""}
            />
            {isVerified && <FaCheckCircle className="verified-icon" />}
          </div>
          {errors.email && (
            <span className="error-text">{errors.email.message}</span>
          )}
          {canSendEmail && !emailSent && !isVerified && (
            <button
              type="button"
              onClick={sendVerificationEmail}
              className="verifBtn"
            >
              {t("auth.sendVerificationCode")}
            </button>
          )}
        </div>

        {/* Verification Code */}
        {emailSent && !isVerified && (
          <div className="input-group">
            <label htmlFor="verification-code">
              {t("auth.verificationCode")}
            </label>
            <input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder={t("auth.enterCode")}
            />
            <button type="button" onClick={verifyCode} className="verifBtn">
              {t("auth.verify")}
            </button>
            {errorMessage && <p className="error-text">{errorMessage}</p>}
            {errorMessage && (
              <button type="button" onClick={resendCode} className="verifBtn">
                {t("auth.resendCode")}
              </button>
            )}
          </div>
        )}

        {isVerified && (
          <div className="verification-success">
            <FaCheckCircle />{" "}
            {t("auth.emailVerified") || "ელ-ფოსტა დადასტურებულია"}
          </div>
        )}

        {/* Password */}
        <div className="input-group">
          <label htmlFor="password">{t("auth.password")}</label>
          <input
            id="password"
            type="password"
            {...registerField("password")}
            placeholder="********"
          />
          {errors.password && (
            <span className="error-text">{errors.password.message}</span>
          )}
        </div>

        {/* Confirm Password */}
        <div className="input-group">
          <label htmlFor="confirmPassword">{t("auth.confirmPassword")}</label>
          <input
            id="confirmPassword"
            type="password"
            {...registerField("confirmPassword")}
            placeholder="********"
          />
          {errors.confirmPassword && (
            <span className="error-text">{errors.confirmPassword.message}</span>
          )}
        </div>

        {/* Phone */}
        <div className="input-group">
          <label htmlFor="phone">{t("auth.phoneNumber")}</label>
          <input
            id="phone"
            type="tel"
            {...registerField("phone")}
            placeholder="5XX XX XX XX"
          />
          {errors.phone && (
            <span className="error-text">{errors.phone.message}</span>
          )}
        </div>

        {/* Personal ID */}
        <div className="input-group">
          <label htmlFor="personalId">
            {t("auth.personalId") || "პირადი ნომერი"}
          </label>
          <input
            id="personalId"
            type="text"
            {...registerField("personalId")}
            placeholder="00000000000"
            maxLength={11}
          />
          {errors.personalId && (
            <span className="error-text">{errors.personalId.message}</span>
          )}
        </div>

        {/* Bank Account (IBAN) */}
        <div className="input-group">
          <label htmlFor="bankAccount">{t("auth.bankAccount")}</label>
          <input
            id="bankAccount"
            type="text"
            {...registerField("bankAccount")}
            placeholder="GE00XX0000000000000000"
            style={{ textTransform: "uppercase" }}
          />
          {errors.bankAccount && (
            <span className="error-text">{errors.bankAccount.message}</span>
          )}
        </div>

        {/* Bank Name - Auto-detected from IBAN */}
        <div className="input-group">
          <label htmlFor="bankName">{t("auth.bankName") || "ბანკი"}</label>
          <input
            id="bankName"
            type="text"
            {...registerField("bankName")}
            readOnly
            className="bank-select"
            placeholder="ავტომატურად შეივსება IBAN-დან"
            style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
          />
          {errors.bankName && (
            <span className="error-text">{errors.bankName.message}</span>
          )}
        </div>

        {/* Terms, Privacy and Partnership Agreement */}
        <div className="sm-privacy-group">
          <label className="sm-privacy-label" style={{ gap: 0 }}>
            <input
              type="checkbox"
              checked={agreedToTerms && agreedToPartnership}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                setAgreedToPartnership(e.target.checked);
              }}
              className="sm-privacy-checkbox"
              style={{ marginRight: "8px" }}
            />
            <div className="sm-privacy-text">
              ვეთანხმები{" "}
              <button
                type="button"
                onClick={() => setShowTermsAndConditions(true)}
                className="sm-privacy-link"
              >
                წესებს
              </button>
              ,{" "}
              <button
                type="button"
                onClick={() => setShowPrivacyPolicy(true)}
                className="sm-privacy-link"
              >
                კონფიდენციალურობას
              </button>{" "}
              და{" "}
              <button
                type="button"
                onClick={() => setShowPartnershipContract(true)}
                className="sm-privacy-link"
              >
                პარტნიორობის ხელშეკრულებას
              </button>
            </div>
          </label>
        </div>

        {/* Privacy Policy Modal */}
        <PrivacyPolicy
          isOpen={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
        />

        {/* Terms and Conditions Modal */}
        <TermsAndConditions
          isOpen={showTermsAndConditions}
          onClose={() => setShowTermsAndConditions(false)}
        />

        {/* Sales Manager Contract Modal */}
        <SalesManagerContract
          isOpen={showPartnershipContract}
          onClose={() => setShowPartnershipContract(false)}
          showAcceptButton={false}
        />

        <button
          type="submit"
          className="submit-btn"
          disabled={
            isPending || !isVerified || !agreedToTerms || !agreedToPartnership
          }
        >
          {isPending ? t("auth.creatingAccount") : t("auth.createAccount")}
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
