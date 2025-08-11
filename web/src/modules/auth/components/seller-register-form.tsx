"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sellerRegisterSchema } from "../validation/seller-register-schema";
import { useSellerRegister } from "../hooks/use-auth";
import Link from "next/link";
import "./register-form.css";
import type * as z from "zod";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import { SellerContract } from "@/components/SellerContract";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";

type SellerRegisterFormData = z.infer<typeof sellerRegisterSchema>;

export function SellerRegisterForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const { mutate: register, isPending } = useSellerRegister();
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

  const {
    register: registerField,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SellerRegisterFormData>({
    resolver: zodResolver(sellerRegisterSchema),
  });

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

    // Create FormData to handle file uploads
    const formData = new FormData();

    // Add all form fields to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value as string);
      }
    });

    // Add the logo file if it exists
    if (fileInputRef.current?.files?.length) {
      formData.append("logoFile", fileInputRef.current.files[0]);
    }

    register(formData, {
      onSuccess: () => {
        setIsSuccess(true);
        toast({
          title: t("auth.registrationSuccessful"),
          description: t("auth.sellerAccountCreatedSuccessfully"),
          variant: "default",
        });

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
          />
          {errors.accountNumber && (
            <p className="error-text">{errors.accountNumber.message}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="invitationCode">რეფერალური კოდი (არჩევითი)</label>
          <input
            id="invitationCode"
            type="text"
            placeholder="მიუთითეთ რეფერალური კოდი თუ გყავთ"
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
