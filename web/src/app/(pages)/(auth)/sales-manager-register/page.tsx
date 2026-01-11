"use client";

import { AuthLayout } from "@/modules/auth/layouts/auth-layout";

import { useLanguage } from "@/hooks/LanguageContext";
import { SalesManagerRegisterForm } from "@/modules/auth/components/sales-manager-register-form";

export default function SalesManagerRegisterPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t("auth.salesManagerWelcome")}
      subtitle={t("auth.salesManagerSubtitle")}
    >
      <SalesManagerRegisterForm />
    </AuthLayout>
  );
}
