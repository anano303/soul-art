import { useLanguage } from "@/hooks/LanguageContext";
import { useCheckout } from "../context/checkout-context";
import {
  formatShippingCost,
  isShippingSupported,
  calculateShipping,
} from "@/lib/shipping";
import { formatPrice } from "@/lib/utils";

interface ShippingSummaryProps {
  subtotal: number;
  tax: number;
}

export function ShippingSummary({ subtotal, tax }: ShippingSummaryProps) {
  const { t } = useLanguage();
  const { shippingAddress } = useCheckout();

  const shippingCountry = shippingAddress?.country || "GE";
  const shippingCost = calculateShipping(shippingCountry);
  const isShippingFree = shippingCost === 0;
  const showBothCurrencies = shippingCountry !== "GE";
  // UI-ში ნაჩვენები ჯამი (საკომისიოს გარეშე)
  const total = subtotal + shippingCost;

  return (
    <div className="shipping-summary">
      <div className="summary-row">
        <span>{t("cart.total")}</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      <div className="summary-row">
        <span>{t("cart.delivery")}</span>
        <span>
          {isShippingFree
            ? t("cart.free")
            : formatShippingCost(shippingCountry, showBothCurrencies)}
        </span>
      </div>

      {/* საკომისიო დაკომენტარებულია - ბანკის გვერდზე ნახავს
      <div className="summary-row">
        <span>{t("cart.commission")}</span>
        <span>{formatPrice(tax)}</span>
      </div>
      */}

      <hr className="separator" />

      <div className="summary-row total">
        <span>{t("cart.totalCost")}</span>
        <span>{formatPrice(total)}</span>
      </div>

      {!isShippingSupported(shippingCountry) && (
        <div className="shipping-warning">
          <p className="error-text">{t("cart.shippingNotSupported")}</p>
        </div>
      )}
    </div>
  );
}
