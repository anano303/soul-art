import { useLanguage } from "@/hooks/LanguageContext";
import Link from "next/link";
import "./cart-empty.css";
import { ShoppingBag } from "lucide-react";

export function CartEmpty() {
  const { t } = useLanguage();

  return (
    <div className="cart-empty-container">
      <div className="cart-empty-icon">
        <ShoppingBag size={70} />
      </div>
      <div className="cart-empty-content">
        <h2 className="cart-empty-title">{t("cart.empty")}</h2>
        <p className="cart-empty-message">{t("cart.emptyDescription")}</p>
      </div>
      <Link href="/shop" className="continue-shopping-button">
        {t("about.buyUnique.button")}
      </Link>
    </div>
  );
}
