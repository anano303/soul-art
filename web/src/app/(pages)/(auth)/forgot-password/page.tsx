"use client";

import { ForgotPasswordForm } from "@/modules/auth/components/forgot-password";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { useLanguage } from "@/hooks/LanguageContext";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t("auth.forgotPasswordTitle")}
      subtitle={t("auth.forgotPasswordSubtitle")}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
