"use client";

import { useLanguage } from "@/hooks/LanguageContext";
import { SalesManagerRegisterForm } from "@/modules/auth/components/sales-manager-register-form";
import { SalesManagerInfo } from "@/modules/auth/components/sales-manager-info";
import "./sales-manager-register.css";

export default function SalesManagerRegisterPage() {
  const { t } = useLanguage();

  return (
    <div className="sm-register-page">
      {/* ფონის გრადიენტი */}
      <div className="sm-register-bg"></div>
      
      <div className="sm-register-container">
        {/* ინფორმაციის სექცია */}
        <SalesManagerInfo />
        
        {/* რეგისტრაციის ფორმა */}
        <div className="sm-register-form-wrapper">
          <div className="sm-register-form-header">
            <h2 className="sm-register-form-title">{t("auth.salesManagerWelcome")}</h2>
            <p className="sm-register-form-subtitle">{t("auth.salesManagerSubtitle")}</p>
          </div>
          <SalesManagerRegisterForm />
        </div>
      </div>
    </div>
  );
}
