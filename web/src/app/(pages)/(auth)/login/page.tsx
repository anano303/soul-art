"use client";

import { LoginForm } from "@/modules/auth/components/login-form";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { useLanguage } from "@/hooks/LanguageContext";

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t("auth.loginWelcome")}
      subtitle={t("auth.loginSubtitle")}
    >
      <LoginForm />
    </AuthLayout>
  );
}
