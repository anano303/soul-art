"use client";

import { RegisterForm } from "@/modules/auth/components/register-form";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { useLanguage } from "@/hooks/LanguageContext";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

function RegisterPageContent() {
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <RegisterPageContent />
    </Suspense>
  );
}
