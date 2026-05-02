"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import { useCurrency } from "@/hooks/use-currency";
import { apiClient } from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import "./vouchers.css";

const CURRENCY_SYMBOLS: Record<string, string> = {
  GEL: "₾",
  USD: "$",
  EUR: "€",
};

const AMOUNTS = [100, 200, 500] as const;
type Amount = (typeof AMOUNTS)[number];

/** სავარაუდო QR კოდის URL — ვაუჩერის გამოყენება checkout-ზე */
const voucherQrUrl = (amount: number, currency: string) =>
  `https://soulart.ge/vouchers?amount=${amount}&currency=${currency}`;

export default function VouchersShopPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { currency } = useCurrency();
  const router = useRouter();

  const [selectedAmount, setSelectedAmount] = useState<Amount>(100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const symbol = CURRENCY_SYMBOLS[currency] || "₾";

  const handleBuy = async () => {
    if (!user) {
      router.push("/login?redirect=/vouchers");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.post("/vouchers/purchase", {
        amount: selectedAmount,
        currency,
      });

      const { redirectUrl, orderId } = res.data as {
        redirectUrl: string;
        orderId: string;
      };

      if (!redirectUrl) {
        setError(
          language === "en"
            ? "Payment URL not received. Please try again."
            : "გადახდის ბმული ვერ მოიძებნა. სცადეთ ხელახლა.",
        );
        return;
      }

      // Store orderId so the success page can retrieve it
      if (typeof window !== "undefined") {
        sessionStorage.setItem("voucher_order_id", orderId);
      }

      // Open BOG payment
      const paymentWindow = window.open(
        redirectUrl,
        "BOGPayment",
        "width=600,height=700,scrollbars=yes",
      );
      if (!paymentWindow) {
        // Fallback: navigate directly
        window.location.href = redirectUrl;
        return;
      }

      // Poll until window closes, then check order status
      const pollClosed = setInterval(() => {
        if (paymentWindow.closed) {
          clearInterval(pollClosed);
          router.push(`/orders/${orderId}?voucher=1`);
        }
      }, 800);

      // Stop polling after 20 minutes
      setTimeout(() => clearInterval(pollClosed), 20 * 60 * 1000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(
        err.response?.data?.message ||
          (language === "en" ? "Something went wrong." : "დაფიქსირდა შეცდომა."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const amountLabel = (a: number) =>
    currency === "USD" ? `${symbol}${a}` : `${a} ${symbol}`;

  const benefits =
    language === "en"
      ? [
          {
            icon: "🎨",
            title: "For art lovers",
            desc: "Perfect for anyone who appreciates original Georgian art.",
          },
          {
            icon: "⚡",
            title: "Instant delivery",
            desc: "Voucher code sent right after payment. No waiting, no shipping.",
          },
          {
            icon: "🔒",
            title: "Secure & unique",
            desc: "Each code is unique and can only be used once.",
          },
        ]
      : [
          {
            icon: "🎨",
            title: "ხელოვნების მოყვარულთათვის",
            desc: "სრულყოფილი საჩუქარი ყველასთვის, ვინც ქართულ ხელოვნებას აფასებს.",
          },
          {
            icon: "⚡",
            title: "მყისიერი მიღება",
            desc: "ვაუჩერის კოდს გადახდის შემდეგ მიიღებ. მიტანა არ სჭირდება.",
          },
          {
            icon: "🔒",
            title: "დაცული და უნიკალური",
            desc: "ყოველი კოდი უნიკალურია და მხოლოდ ერთჯერადად გამოიყენება.",
          },
        ];

  return (
    <div className="vsp-page">
      {/* ── Hero ── */}
      <div className="vsp-hero">
        <div className="vsp-hero-inner Container">
          <div className="vsp-hero-text">
            <Link href="/" className="vsp-back">
              ← {language === "en" ? "მთავარი" : "მთავარი"}
            </Link>
            <h1 className="vsp-hero-title">
              {language === "en" ? "Give the gift of art" : "გაუჩუქე ხელოვნება"}
            </h1>
            <p className="vsp-hero-subtitle">
              {language === "en"
                ? "A beautifully designed gift voucher for SoulArt — original Georgian artworks, jewelry and gifts. Choose an amount, pay online and receive the code instantly."
                : "SoulArt-ის საჩუქრის ვაუჩერი — ორიგინალური ქართული ნამუშევრები, სამკაულები და საჩუქრები. აირჩიე თანხა, გადაიხადე ონლაინ და კოდი მყისიერად გეძლევა."}
            </p>
            <div className="vsp-hero-badges">
              <span className="vsp-badge">
                ✓ {language === "en" ? "No delivery" : "მიტანა არ სჭირდება"}
              </span>
              <span className="vsp-badge">
                ✓ {language === "en" ? "Valid 1 month" : "ვადა — 1 თვე"}
              </span>
              <span className="vsp-badge">
                ✓ {language === "en" ? "Printable" : "ამობეჭდვადი"}
              </span>
              <span className="vsp-badge vsp-badge--highlight">
                🎨{" "}
                {language === "en"
                  ? "500+ artworks · 1 platform"
                  : "500+ ხელოვანის ნამუშევარი ერთ სივრცეში"}
              </span>
            </div>
          </div>

          {/* Preview gift card */}
          <div className="vsp-preview-card">
            <div className="vsp-card-inner">
              <div className="vsp-card-top">
                <span className="vsp-card-brand">SoulArt</span>
                <span className="vsp-card-type">
                  {language === "en" ? "Gift Voucher" : "საჩუქრის ვაუჩერი"}
                </span>
              </div>
              <div className="vsp-card-amount">
                {amountLabel(selectedAmount)}
              </div>
              <div className="vsp-card-bottom">
                <div className="vsp-card-qr">
                  <QRCodeSVG
                    value={voucherQrUrl(selectedAmount, currency)}
                    size={72}
                    bgColor="transparent"
                    fgColor="rgba(255,255,255,0.85)"
                    level="M"
                  />
                </div>
                <div className="vsp-card-meta">
                  <div className="vsp-card-code">SOUL-XXXX-XXXX</div>
                  <div className="vsp-card-valid">
                    {language === "en"
                      ? "Valid · 1 month · soulart.ge"
                      : "მოქმედი · 1 თვე · soulart.ge"}
                  </div>
                </div>
              </div>
            </div>
            <div className="vsp-card-glow" />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="vsp-content Container">
        {/* Amount selector */}
        <section className="vsp-section">
          <h2 className="vsp-section-title">
            {language === "en" ? "Choose amount" : "აირჩიე ნომინალი"}
          </h2>
          <div className="vsp-amounts">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                className={`vsp-amount-btn ${selectedAmount === a ? "active" : ""}`}
                onClick={() => setSelectedAmount(a)}
              >
                <div className="vsp-amount-card">
                  <div className="vsp-amount-card-header">
                    <span className="vsp-amount-brand">SoulArt</span>
                    <span className="vsp-amount-label">
                      {language === "en" ? "Gift Voucher" : "საჩუქრის ვაუჩერი"}
                    </span>
                  </div>
                  <div className="vsp-amount-value">{amountLabel(a)}</div>
                  <div className="vsp-amount-qr-row">
                    <QRCodeSVG
                      value={voucherQrUrl(a, currency)}
                      size={48}
                      bgColor="transparent"
                      fgColor="rgba(255,255,255,0.7)"
                      level="M"
                    />
                    <div className="vsp-amount-card-footer">
                      <span>soulart.ge</span>
                      <span>
                        {language === "en"
                          ? "1 month · single use"
                          : "1 თვე · ერთჯერადი"}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedAmount === a && <span className="vsp-check">✓</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Purchase box */}
        <section className="vsp-purchase-box">
          <div className="vsp-purchase-summary">
            <div className="vsp-purchase-row">
              <span>{language === "en" ? "Voucher:" : "ვაუჩერი:"}</span>
              <strong>{amountLabel(selectedAmount)}</strong>
            </div>
            <div className="vsp-purchase-row">
              <span>{language === "en" ? "Delivery:" : "მიტანა:"}</span>
              <span className="vsp-green">
                {language === "en" ? "Digital · instant" : "ციფრული · მყისიერი"}
              </span>
            </div>
            <div className="vsp-purchase-row">
              <span>{language === "en" ? "Valid:" : "ვადა:"}</span>
              <span>
                {language === "en"
                  ? "1 month from purchase"
                  : "1 თვე შეძენიდან"}
              </span>
            </div>
            <hr className="vsp-divider" />
            <div className="vsp-purchase-row vsp-purchase-total">
              <span>{language === "en" ? "You pay:" : "გადაიხდი:"}</span>
              <strong>{amountLabel(selectedAmount)}</strong>
            </div>
          </div>

          {error && <p className="vsp-error">{error}</p>}

          <button
            className="vsp-btn-buy"
            onClick={handleBuy}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="vsp-spinner" />
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            )}
            {isLoading
              ? language === "en"
                ? "Processing..."
                : "მუშავდება..."
              : language === "en"
                ? "Pay with CARD"
                : "ბარათით გადახდა "}
          </button>

          {!user && (
            <p className="vsp-login-hint">
              <Link href="/login?redirect=/vouchers" className="vsp-login-link">
                {language === "en" ? "Log in" : "გაიარეთ ავტორიზაცია"}
              </Link>
              {language === "en" ? " to purchase." : " ვაუჩერის შესაძენად."}
            </p>
          )}
        </section>

        {/* Benefits */}
        <section className="vsp-benefits">
          {benefits.map((b) => (
            <div key={b.title} className="vsp-benefit-card">
              <div className="vsp-benefit-icon">{b.icon}</div>
              <h3 className="vsp-benefit-title">{b.title}</h3>
              <p className="vsp-benefit-desc">{b.desc}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="vsp-steps-section">
          <h2 className="vsp-section-title">
            {language === "en" ? "How it works" : "როგორ მუშაობს"}
          </h2>
          <div className="vsp-steps">
            {(language === "en"
              ? [
                  {
                    n: "01",
                    t: "Choose & pay",
                    d: "Pick an amount (100, 200 or 500) and pay securely via BOG.",
                  },
                  {
                    n: "02",
                    t: "Get the code",
                    d: "Your unique code + QR appears in the order right after payment.",
                  },
                  {
                    n: "03",
                    t: "Print or share",
                    d: "Print a beautiful card or forward the code digitally.",
                  },
                  {
                    n: "04",
                    t: "Use at checkout",
                    d: "Recipient enters the code at SoulArt checkout for an instant discount.",
                  },
                ]
              : [
                  {
                    n: "01",
                    t: "აირჩიე და გადაიხადე",
                    d: "შეარჩიე სასურველი ნომინალი (100, 200 ან 500) და გადაიხადე ბარათით.",
                  },
                  {
                    n: "02",
                    t: "მიიღე კოდი",
                    d: "შეკვეთაში მყისიერად გამოჩნდება შენი უნიკალური კოდი და QR.",
                  },
                  {
                    n: "03",
                    t: "ამობეჭდე ან გაუგზავნე",
                    d: "ამობეჭდე ლამაზი ბარათი და გაუგზავნე კოდი ციფრულად.",
                  },
                  {
                    n: "04",
                    t: "გამოიყენე შეკვეთისას",
                    d: "მიმღებს შეჰყავს კოდი SoulArt-ზე შეკვეთისას და იღებს ფასდაკლებას.",
                  },
                ]
            ).map((s) => (
              <div key={s.n} className="vsp-step">
                <div className="vsp-step-num">{s.n}</div>
                <div>
                  <div className="vsp-step-title">{s.t}</div>
                  <div className="vsp-step-desc">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
