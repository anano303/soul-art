import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import { FaLock } from "react-icons/fa";
import "./unauthorized-error.css";

export function UnauthorizedError() {
  const { t } = useLanguage();

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-icon">
        <FaLock />
      </div>
      <h2 className="unauthorized-title">{t("errors.unauthorized")}</h2>
      <p className="unauthorized-message">
        {t("errors.pleaseLoginOrRegister")}
      </p>
      <div className="auth-buttons-container">
        <Link href="/login" className="login-button">
          {t("auth.login")}
        </Link>
        <Link href="/register" className="register-button">
          {t("auth.register")}
        </Link>
      </div>
    </div>
  );
}
