"use client";

import { Suspense } from "react";
import { LoginForm } from "@/modules/auth/components/login-form";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { useLanguage } from "@/hooks/LanguageContext";

export const dynamic = "force-dynamic";

function LoginPageContent() {
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <LoginPageContent />
    </Suspense>
  );
}
