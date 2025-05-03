import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";

export function UnauthorizedError() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
      <h2 className="text-2xl font-bold mb-4">{t("errors.unauthorized")}</h2>
      <p className="mb-6 text-gray-600">{t("errors.pleaseLoginOrRegister")}</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90"
        >
          {t("auth.login")}
        </Link>
        <br />
        <Link
          href="/register"
          className="bg-secondary text-white px-6 py-2 rounded-md hover:bg-secondary/90"
        >
          {t("auth.register")}
        </Link>
      </div>
    </div>
  );
}
