"use client";

import { RegisterForm } from "@/modules/auth/components/register-form";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { useLanguage } from "@/hooks/LanguageContext";
import { Suspense } from "react";

export default function RegisterPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t("auth.registerWelcome")}
      subtitle={t("auth.registerSubtitle")}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}
