import { useLanguage } from "@/hooks/LanguageContext";
import Link from "next/link";

export function CartEmpty() {
  const { t } = useLanguage();

  return (
    <div className="cart-empty">
      <div className="cart-empty-icon">🛒</div>
      <h2 className="cart-empty-title">{t("cart.empty")}</h2>
      <p className="cart-empty-text">{t("cart.emptyDescription")}</p>
      <Link href="/shop" className="cart-empty-button">
        {t("about.buyUnique.button")}
      </Link>
    </div>
  );
}
