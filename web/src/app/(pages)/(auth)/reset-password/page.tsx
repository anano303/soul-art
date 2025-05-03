import { Suspense } from "react";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password";
import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { useLanguage } from "@/hooks/LanguageContext";

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t("auth.forgotPasswordTitle")}
      subtitle={t("auth.forgotPasswordSubtitle")}
    >
      <Suspense fallback={<div>{t("profile.loading")}</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
