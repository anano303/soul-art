"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../validation";
import { useLogin } from "../hooks/use-auth";
import { FaGoogle } from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";
import { useErrorHandler } from "@/hooks/use-error-handler";

import type * as z from "zod";

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { t } = useLanguage();
  const errorHandler = useErrorHandler();
  const { mutate: login, isLoading, error: hookError } = useLogin();
  const [loginError, setLoginError] = useState<string | null>(null);
  const router = useRouter();
  const [returnUrl, setReturnUrl] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("returnUrl") || params.get("redirect") || "/";
    setReturnUrl(url);
  }, []);

  // Watch for errors from the hook
  useEffect(() => {
    if (hookError) {
      const errorMessage =
        hookError instanceof Error
          ? hookError.message
          : "ავტორიზაცია ვერ მოხერხდა";
      setLoginError(errorMessage);
    }
  }, [hookError]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    setLoginError(null); // Clear previous errors

    try {
      login(data, {
        onSuccess: (response) => {
          if (response.success) {
            // Successfully logged in
            toast({
              title: "წარმატებული ავტორიზაცია",
              description: "კეთილი იყოს თქვენი დაბრუნება!",
              variant: "default",
            });
            router.push(returnUrl);
          } else {
            // Login was processed but returned an error
            const errorMessage = response.error || "ავტორიზაცია ვერ მოხერხდა";
            setLoginError(errorMessage);
            toast({
              title: "ავტორიზაციის შეცდომა",
              description: errorMessage,
              variant: "destructive",
            });
          }
        },
        onError: (error) => {
          // Use centralized error handler with translations
          errorHandler.showToast(error, t("auth.loginFailed"));
          setLoginError(errorHandler.handle(error).message);
        },
      });
    } catch (error) {
      // Use centralized error handler for unexpected errors too
      errorHandler.showToast(error, t("errors.generic"));
      setLoginError(errorHandler.handle(error).message);
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit(onSubmit)} className="login-form">
        <div className="input-group">
          <label htmlFor="email">{t("auth.email")}</label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register("email")}
            className={errors.email || loginError ? "error-input" : ""}
          />
          {errors.email && <p className="error-text">{errors.email.message}</p>}
        </div>

        <div className="input-group">
          <label htmlFor="password">{t("auth.password")}</label>
          <input
            id="password"
            type="password"
            placeholder="********"
            {...register("password")}
            className={errors.password || loginError ? "error-input" : ""}
          />
          {errors.password && (
            <p className="error-text">{errors.password.message}</p>
          )}
        </div>

        {/* Enhanced error message display */}
        {loginError && (
          <div className="error-message">
            <p className="error-text">{loginError}</p>
          </div>
        )}

        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? (
            <span className="loading-spinner"></span>
          ) : (
            t("auth.loginButton")
          )}
        </button>

        <div className="separator">
          <span className="separator-text">{t("auth.orLoginWith")}</span>
        </div>

        <div className="social-buttons">
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="social-button google-btn"
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
      </form>
      <div className="forgot-password signup-text">
        <Link href="/forgot-password" className="signup-link">
          {t("auth.forgotPassword")}
        </Link>
      </div>

      <div className="signup-text">
        {t("auth.dontHaveAccount")}{" "}
        <Link href="/register" className="signup-link">
          {t("auth.createAccount")}
        </Link>
      </div>
    </div>
  );
}
