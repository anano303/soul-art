"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sellerRegisterSchema } from "../validation/seller-register-schema";
import { useSellerRegister } from "../hooks/use-auth";
import Link from "next/link";
import "./register-form.css";
import type * as z from "zod";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";

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

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<SellerRegisterFormData>({
    resolver: zodResolver(sellerRegisterSchema),
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
    setRegistrationError(null);
    setPrivacyError(null);

    // Check if privacy policy is agreed
    if (!privacyAgreed) {
      setPrivacyError(t("auth.privacyPolicyRequired"));
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
              <Link href="/privacy-policy" className="privacy-policy-link">
                {t("privacyPolicy.title")}
              </Link>
            </span>
          </label>
          {privacyError && <p className="error-text">{privacyError}</p>}
        </div>

        <button
          type="submit"
          className={`submit-btn ${!privacyAgreed ? "disabled" : ""}`}
          disabled={isPending || !privacyAgreed}
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
