"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/LanguageContext";

import "./reset-password.css";

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the token from URL query parameters
  const token = searchParams?.get("token") || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    if (newPassword.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }

    // Validate token exists
    if (!token) {
      setError(t("auth.invalidResetLink"));
      return;
    }

    setLoading(true);

    try {
      // Send request to API with token and newPassword
      await apiClient.post("/auth/reset-password", {
        token,
        newPassword,
      });

      // Show success message
      toast({
        title: t("auth.passwordResetSuccessful"),
        description: t("auth.passwordUpdated"),
        variant: "default",
      });

      // Redirect to login page
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: unknown) {
      console.error("Password reset failed:", error);

      // Properly type the error response
      interface ApiErrorResponse {
        response?: {
          data?: {
            message?: string;
          };
        };
      }

      const apiError = error as ApiErrorResponse;
      setError(
        apiError?.response?.data?.message || t("auth.passwordResetFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {!token ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">{t("auth.invalidResetLink")}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="block text-sm font-medium">
              {t("auth.newPassword")}
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("auth.enterNewPassword")}
              required
              disabled={loading}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium"
            >
              {t("auth.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.confirmNewPassword")}
              required
              disabled={loading}
              className="w-full"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full">
            {loading ? t("auth.updatingPassword") : t("auth.resetPassword")}
          </button>
        </form>
      )}
    </div>
  );
}
