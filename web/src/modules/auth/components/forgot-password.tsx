"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import axios, { AxiosError } from "axios";
import { useToast } from "@/hooks/use-toast";
import "./reset-password.css";
import { useLanguage } from "@/hooks/LanguageContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface ForgotPasswordFormData {
  email: string;
}

export function ForgotPasswordForm() {
  const { t } = useLanguage();
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
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: data.email,
      });

      toast({
        title: t("auth.success"),
        description: t("auth.checkEmailForResetLink"),
      });
    } catch (error: unknown) {
      const err = error as AxiosError<{ message: string }>;
      toast({
        title: t("auth.error"),
        description:
          err.response?.data?.message || t("auth.somethingWentWrong"),
        variant: "destructive",
      });
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
