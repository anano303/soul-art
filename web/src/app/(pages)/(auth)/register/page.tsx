"use client";

import { RegisterForm } from "@/modules/auth/components/register-form";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { useLanguage } from "@/hooks/LanguageContext";

export default function RegisterPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t("auth.registerWelcome")}
      subtitle={t("auth.registerSubtitle")}
    >
      <RegisterForm />
    </AuthLayout>
  );
}
