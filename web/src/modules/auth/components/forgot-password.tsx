"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { apiClient } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/use-error-handler";
import "./reset-password.css";
import { useLanguage } from "@/hooks/LanguageContext";

interface ForgotPasswordFormData {
  email: string;
}

export function ForgotPasswordForm() {
  const { t } = useLanguage();
  const errorHandler = useErrorHandler();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onSubmit: SubmitHandler<ForgotPasswordFormData> = async (data) => {
    setLoading(true);
    try {
      await apiClient.post(`/auth/forgot-password`, {
        email: data.email,
      });

      toast({
        title: t("auth.success"),
        description: t("auth.checkEmailForResetLink"),
      });
    } catch (error: unknown) {
      errorHandler.showToast(error, t("auth.passwordResetFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="forPass" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <input
          type="email"
          placeholder={t("auth.enterYourEmail")}
          {...register("email", { required: t("auth.emailRequired") })}
        />
        {errors.email && (
          <span style={{ color: "red" }}>{errors.email.message}</span>
        )}
      </div>
      <button type="submit" disabled={loading} className="w-full">
        {loading ? t("auth.sending") : t("auth.sendResetLink")}
      </button>
    </form>
  );
}
