"use client";

import { AuthLayout } from "@/modules/auth/layouts/auth-layout";
import { SellerRegisterForm } from "@/modules/auth/components/seller-register-form";
import SellerBenefits from "@/components/sellerBenefits/sellerBenefits";
import styles from "./seller-register.module.css";
import { useLanguage } from "@/hooks/LanguageContext";

export default function SellerRegisterPage() {
  const { t } = useLanguage();

  return (
    <div className={styles.sellerRegisterContainer}>
      <div className={styles.benefitsSection}>
        <SellerBenefits />
      </div>
      <div className={styles.formSection}>
        <AuthLayout
          title={t("auth.sellerWelcome")}
          subtitle={t("auth.sellerSubtitle")}
        >
          <SellerRegisterForm />
        </AuthLayout>
      </div>
    </div>
  );
}
