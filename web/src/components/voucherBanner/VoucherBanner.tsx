"use client";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import { useCurrency } from "@/hooks/use-currency";
import "./voucher-banner.css";

export default function VoucherBanner() {
  const { language } = useLanguage();
  const { currency } = useCurrency();

  const amounts =
    currency === "USD"
      ? ["$100", "$200", "$500"]
      : currency === "EUR"
        ? ["100€", "200€", "500€"]
        : ["100₾", "200₾", "500₾"];

  return (
    <section className="voucher-banner-section">
      <div className="voucher-banner-inner Container">
        <div className="voucher-banner-text">
          <span className="voucher-banner-tag">
            🎟 {language === "en" ? "Gift Vouchers" : "საჩუქრის ვაუჩერები"}
          </span>
          <h2 className="voucher-banner-title">
            {language === "en" ? "Give the gift of art" : "გაუჩუქე ხელოვნება"}
          </h2>
          <p className="voucher-banner-desc">
            {language === "en"
              ? "Buy a digital voucher — recipient uses it at checkout. No shipping needed."
              : "იყიდე ვაუჩერი — მიმღები იყენებს შეკვეთისას. მიტანა არ სჭირდება."}
          </p>
          <div className="voucher-banner-amounts">
            {amounts.map((a) => (
              <span key={a} className="voucher-amount-pill">
                {a}
              </span>
            ))}
          </div>
          <Link href="/vouchers" className="btn-voucher-cta">
            {language === "en" ? "Buy a Voucher" : "ვაუჩერის შეძენა"}
          </Link>
        </div>
        <div className="voucher-banner-card" aria-hidden="true">
          <div className="vbc-logo">SoulArt</div>
          <div className="vbc-label">
            {language === "en" ? "Gift Voucher" : "საჩუქრის ვაუჩერი"}
          </div>
          <div className="vbc-amount">{amounts[1]}</div>
          <div className="vbc-code">SOUL-XXXX-XXXX</div>
        </div>
      </div>
    </section>
  );
}
