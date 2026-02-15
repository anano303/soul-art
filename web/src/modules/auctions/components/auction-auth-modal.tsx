"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaEye, FaEyeSlash, FaTimes, FaGavel } from "react-icons/fa";
import { FacebookAuthButton } from "@/components/auth/FacebookAuthButton";
import { GoogleAuthPopup } from "@/components/auth/GoogleAuthPopup";
import { useLogin, useFacebookAuth } from "@/modules/auth/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/LanguageContext";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import "./auction-auth-modal.css";

const loginSchema = z.object({
  email: z.string().email("არასწორი ელ-ფოსტის ფორმატი"),
  password: z.string().min(1, "პაროლის შეყვანა სავალდებულოა"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface AuctionAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  auctionTitle?: string;
  currentPrice?: number;
}

export function AuctionAuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  auctionTitle,
  currentPrice,
}: AuctionAuthModalProps) {
  const { t, language } = useLanguage();
  const errorHandler = useErrorHandler();
  const queryClient = useQueryClient();
  const { mutate: login, isLoading } = useLogin();
  const { mutate: facebookAuth, isPending: isFacebookPending } = useFacebookAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      reset();
      setLoginError(null);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscape, reset]);

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    setLoginError(null);

    login(data, {
      onSuccess: (response) => {
        if (response.success) {
          toast({
            title: language === "ge" ? "წარმატებული ავტორიზაცია" : "Login Successful",
            description: language === "ge" ? "ახლა შეგიძლიათ ფსონის დადება!" : "You can now place your bid!",
            variant: "default",
          });
          onLoginSuccess();
          onClose();
        } else {
          setLoginError(response.error || "ავტორიზაცია ვერ მოხერხდა");
        }
      },
      onError: (error) => {
        errorHandler.showToast(error, t("auth.loginFailed"));
        setLoginError(errorHandler.handle(error).message);
      },
    });
  };

  const handleGoogleSuccess = () => {
    // Set bridge cookie for middleware auth check
    document.cookie = 'auth_session=active; path=/; max-age=3600; SameSite=Lax';
    // Invalidate user query to refetch fresh user data stored by popup callback
    queryClient.invalidateQueries({ queryKey: ["user"] });
    toast({
      title: language === "ge" ? "წარმატებული ავტორიზაცია" : "Login Successful",
      description: language === "ge" ? "ახლა შეგიძლიათ ფსონის დადება!" : "You can now place your bid!",
      variant: "default",
    });
    onLoginSuccess();
    onClose();
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
        toast({
          title: language === "ge" ? "წარმატებული ავტორიზაცია" : "Login Successful",
          description: language === "ge" ? "ახლა შეგიძლიათ ფსონის დადება!" : "You can now place your bid!",
          variant: "default",
        });
        onLoginSuccess();
        onClose();
      },
      onError: (error) => {
        errorHandler.showToast(error, t("auth.loginFailed"));
        setLoginError(errorHandler.handle(error).message);
      },
    });
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="auction-auth-overlay" onClick={onClose}>
      <div
        className="auction-auth-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-auth-title"
      >
        <button
          className="auction-auth-close"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>

        <div className="auction-auth-header">
          <div className="auction-auth-icon">
            <FaGavel />
          </div>
          <h2 id="auction-auth-title">
            {language === "ge" ? "ავტორიზაცია საჭიროა" : "Login Required"}
          </h2>
          <p className="auction-auth-subtitle">
            {language === "ge"
              ? "ფსონის დასადებად გაიარეთ ავტორიზაცია"
              : "Please login to place your bid"}
          </p>
          {auctionTitle && currentPrice && (
            <div className="auction-auth-context">
              <span className="auction-title-preview">{auctionTitle}</span>
              <span className="auction-price-preview">
                {language === "ge" ? "მიმდინარე ფასი:" : "Current Price:"}{" "}
                <strong>{currentPrice} ₾</strong>
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auction-auth-form">
          <div className="auction-auth-input-group">
            <label htmlFor="auction-email">
              {language === "ge" ? "ელ-ფოსტა" : "Email"}
            </label>
            <input
              id="auction-email"
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              className={errors.email ? "error" : ""}
              autoComplete="email"
            />
            {errors.email && (
              <span className="input-error">{errors.email.message}</span>
            )}
          </div>

          <div className="auction-auth-input-group">
            <label htmlFor="auction-password">
              {language === "ge" ? "პაროლი" : "Password"}
            </label>
            <div className="password-wrapper">
              <input
                id="auction-password"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                {...register("password")}
                className={errors.password ? "error" : ""}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && (
              <span className="input-error">{errors.password.message}</span>
            )}
          </div>

          {loginError && (
            <div className="auction-auth-error">{loginError}</div>
          )}

          <button
            type="submit"
            className="auction-auth-submit"
            disabled={isLoading || isFacebookPending}
          >
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : language === "ge" ? (
              "შესვლა"
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="auction-auth-divider">
          <span>{language === "ge" ? "ან" : "or"}</span>
        </div>

        <div className="auction-auth-social">
          <GoogleAuthPopup
            onSuccess={handleGoogleSuccess}
            onError={(error) => setLoginError(error)}
            disabled={isLoading || isFacebookPending}
            className="social-btn google"
          />
          <FacebookAuthButton
            onSuccess={handleFacebookSuccess}
            onError={(error) => setLoginError(error)}
            disabled={isLoading || isFacebookPending}
            variant="login"
          />
        </div>

        <div className="auction-auth-footer">
          <Link href="/forgot-password" onClick={onClose}>
            {language === "ge" ? "დაგავიწყდა პაროლი?" : "Forgot password?"}
          </Link>
          <span className="separator">•</span>
          <Link href="/register" onClick={onClose}>
            {language === "ge" ? "რეგისტრაცია" : "Register"}
          </Link>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Hook for managing modal state
export function useAuctionAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const open = (onSuccess?: () => void) => {
    if (onSuccess) {
      setPendingAction(() => onSuccess);
    }
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setPendingAction(null);
  };

  const handleLoginSuccess = () => {
    const action = pendingAction;
    setIsOpen(false);
    setPendingAction(null);
    if (action) {
      // Wait for modal to close and auth state to propagate
      setTimeout(() => {
        action();
      }, 300);
    }
  };

  return {
    isOpen,
    open,
    close,
    onLoginSuccess: handleLoginSuccess,
  };
}

export default AuctionAuthModal;
