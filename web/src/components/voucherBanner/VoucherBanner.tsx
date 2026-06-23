"use client";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import { useCurrency } from "@/hooks/use-currency";
import "./voucher-banner.css";

function Dreamcatcher() {
  return (
    <svg
      className="vbc-dreamcatcher"
      viewBox="0 0 120 200"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="60" cy="55" r="48" stroke="currentColor" strokeWidth="2" />
      <circle cx="60" cy="55" r="34" stroke="currentColor" strokeWidth="1" />
      <circle cx="60" cy="55" r="20" stroke="currentColor" strokeWidth="1" />
      <circle cx="60" cy="55" r="5" fill="currentColor" />
      {/* web spokes */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={60 + Math.cos(a) * 5}
            y1={55 + Math.sin(a) * 5}
            x2={60 + Math.cos(a) * 48}
            y2={55 + Math.sin(a) * 48}
            stroke="currentColor"
            strokeWidth="0.7"
            opacity="0.6"
          />
        );
      })}
      {/* hanging strings */}
      <line x1="42" y1="100" x2="42" y2="150" stroke="currentColor" strokeWidth="1" />
      <line x1="60" y1="103" x2="60" y2="175" stroke="currentColor" strokeWidth="1" />
      <line x1="78" y1="100" x2="78" y2="150" stroke="currentColor" strokeWidth="1" />
      {/* feathers */}
      {[
        [42, 150],
        [60, 175],
        [78, 150],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse cx="0" cy="12" rx="5" ry="14" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="-2" x2="0" y2="26" stroke="currentColor" strokeWidth="0.7" />
        </g>
      ))}
    </svg>
  );
}

export default function VoucherBanner() {
  const { language } = useLanguage();
  const { currency } = useCurrency();

  const fmt = (n: number) =>
    currency === "USD" ? `$${n}` : currency === "EUR" ? `${n}€` : `${n}₾`;

  const cards = [
    { value: 100, cls: "vbc-blue" },
    { value: 200, cls: "vbc-gold" },
    { value: 500, cls: "vbc-emerald" },
  ];

  return (
    <section className="voucher-banner-section">
      <div className="voucher-banner-inner Container">
        <div className="voucher-banner-text">
          <span className="voucher-banner-tag">
            🎟 {language === "en" ? "Gift Vouchers" : "საჩუქრის ვაუჩერები"}
          </span>
          <h2 className="voucher-banner-title">
            {language === "en"
              ? "Give the gift of art"
              : "აჩუქე ემოცია, აირჩიე SoulArt"}
          </h2>
          <p className="voucher-banner-desc">
            {language === "en"
              ? "Buy a digital voucher — recipient uses it at checkout. No shipping needed."
              : "შეიძინე ვაუჩერი — მიმღები იყენებს შეკვეთისას. მიტანა არ სჭირდება."}
          </p>
          <div className="voucher-banner-amounts">
            {[100, 200, 500].map((a) => (
              <span key={a} className="voucher-amount-pill">
                {fmt(a)}
              </span>
            ))}
          </div>
          <Link href="/vouchers" className="btn-voucher-cta">
            {language === "en" ? "Buy Voucher" : "შეიძინე ვაუჩერი"}
          </Link>
        </div>

        <div className="voucher-banner-cards" aria-hidden="true">
          {cards.map((c) => (
            <div key={c.value} className={`vbc ${c.cls}`}>
              <Dreamcatcher />
              <div className="vbc-body">
                <div className="vbc-logo">SoulArt</div>
                <div className="vbc-label">Gift Voucher</div>
                <div className="vbc-amount">{fmt(c.value)}</div>
                <div className="vbc-code">SOUL-XXXX-XXXX-{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
