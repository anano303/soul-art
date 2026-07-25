"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Store,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Wallet,
  CreditCard,
  Star,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import "./etsy-publish.css";

interface ProductData {
  _id: string;
  name: string;
  nameEn?: string;
  price: number;
  images: string[];
}

interface EtsyPreview {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  alreadyListed: {
    listingId: string;
    listingUrl?: string;
    state: string;
  } | null;
  listing: {
    title: string;
    description: string;
    quantity: number;
    tags: string[];
    materials: string[];
    taxonomyPath: string | null;
    imageCount: number;
  };
  pricing: {
    priceGel: number;
    commissionPercent: number;
    priceWithCommissionGel: number;
    usdRate: number;
    priceUsd: number;
    listingFeeGel: number;
    sellerBalanceGel: number | null;
    canPayFromBalance: boolean;
    soulartCommissionPercent: number;
    sellerEarnsGel: number;
  };
  pendingPayment: {
    status: string;
    expiresAt: string;
    secondsLeft: number | null;
  } | null;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const BLOCKER_MESSAGES: Record<string, { ka: string; en: string }> = {
  INTEGRATION_DISABLED: {
    ka: "Etsy ინტეგრაცია ამჟამად გამორთულია",
    en: "Etsy integration is currently disabled",
  },
  NOT_CONFIGURED: {
    ka: "Etsy არ არის კონფიგურირებული სერვერზე",
    en: "Etsy is not configured on the server",
  },
  SHOP_NOT_CONNECTED: {
    ka: "SoulArt-ის Etsy მაღაზია არ არის დაკავშირებული",
    en: "The SoulArt Etsy shop is not connected",
  },
  NO_ETSY_SHOP: {
    ka: "Etsy ანგარიშზე მაღაზია ჯერ არ არის გახსნილი",
    en: "The Etsy account has no shop yet",
  },
  PRODUCT_NOT_APPROVED: {
    ka: "პროდუქტი ჯერ არ არის დამტკიცებული",
    en: "Product is not approved yet",
  },
  OUT_OF_STOCK: {
    ka: "პროდუქტი მარაგში არ არის",
    en: "Product is out of stock",
  },
  NO_IMAGES: {
    ka: "პროდუქტს არ აქვს ფოტოები",
    en: "Product has no images",
  },
  TAXONOMY_UNRESOLVED: {
    ka: "პროდუქტს ვერ მოვუძებნეთ შესაბამისი Etsy კატეგორია",
    en: "Could not find a matching Etsy category for this product",
  },
  NO_SHIPPING_PROFILE: {
    ka: "Etsy მაღაზიას ჯერ არ აქვს მიწოდების პროფილი — ადმინმა უნდა შექმნას Etsy Shop Manager → Settings → Delivery settings",
    en: "The Etsy shop has no shipping profile yet — an admin must create one in Etsy Shop Manager → Settings → Delivery settings",
  },
};

function EtsyPublishContent() {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isKa = language !== "en";

  const productId = searchParams ? searchParams.get("id") : null;
  const paymentResult = searchParams ? searchParams.get("etsy") : null;

  const [product, setProduct] = useState<ProductData | null>(null);
  const [preview, setPreview] = useState<EtsyPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [mainImage, setMainImage] = useState(0);
  const [published, setPublished] = useState<{
    listingUrl?: string;
    state: string;
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError("");
    try {
      const [productRes, previewRes] = await Promise.all([
        fetchWithAuth(`/products/${productId}`),
        fetchWithAuth(`/etsy/products/${productId}/preview`),
      ]);
      const productData = await productRes.json();
      const previewData = await previewRes.json();

      if (!productRes.ok) {
        throw new Error(productData?.message || "Product not found");
      }
      if (!previewRes.ok) {
        throw new Error(previewData?.message || "Failed to load Etsy preview");
      }
      setProduct(productData);
      setPreview(previewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live countdown for a pending card-payment session; when it hits zero
  // the backend has expired the payment, so reload to re-enable buttons
  useEffect(() => {
    const seconds = preview?.pendingPayment?.secondsLeft;
    if (seconds == null) {
      setCountdown(null);
      return;
    }
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown((current) => {
        if (current === null) return null;
        if (current <= 1) {
          clearInterval(interval);
          loadData();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [preview?.pendingPayment?.secondsLeft, loadData]);

  useEffect(() => {
    if (paymentResult === "fail") {
      toast({
        variant: "destructive",
        title: "Etsy",
        description: isKa
          ? "გადახდა ვერ შესრულდა — ნამუშევარი არ განთავსებულა"
          : "Payment failed — the listing was not published",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentResult]);

  const handleBalancePay = async () => {
    if (!productId) return;
    setPublishing(true);
    try {
      const res = await fetchWithAuth(`/etsy/products/${productId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Publish failed");
      setPublished(data);
      toast({
        title: isKa ? "გამოქვეყნდა Etsy-ზე! 🎉" : "Published to Etsy! 🎉",
        description: isKa
          ? `ფასი Etsy-ზე: $${data.priceUsd}`
          : `Etsy price: $${data.priceUsd}`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: isKa ? "შეცდომა" : "Error",
        description:
          err instanceof Error ? err.message : "Failed to publish to Etsy",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleCardPay = async () => {
    if (!productId) return;
    setPublishing(true);
    try {
      const res = await fetchWithAuth("/payments/bog/etsy-listing/create", {
        method: "POST",
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        throw new Error(data?.message || "Payment initialization failed");
      }
      window.location.href = data.redirectUrl;
    } catch (err) {
      toast({
        variant: "destructive",
        title: isKa ? "შეცდომა" : "Error",
        description:
          err instanceof Error ? err.message : "Failed to start payment",
      });
      setPublishing(false);
    }
  };

  if (!productId) {
    return (
      <div className="etsy-page">
        <p className="etsy-page-error">
          {isKa ? "პროდუქტი არ არის მითითებული" : "No product specified"}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="etsy-page etsy-page-center">
        <Loader2 size={28} className="etsy-spin" />
        <p>{isKa ? "იტვირთება..." : "Loading..."}</p>
      </div>
    );
  }

  if (error || !product || !preview) {
    return (
      <div className="etsy-page">
        <Link href="/admin/products" className="etsy-back-link">
          <ArrowLeft size={16} />
          {isKa ? "პროდუქტებზე დაბრუნება" : "Back to products"}
        </Link>
        <p className="etsy-page-error">❌ {error || "Failed to load"}</p>
      </div>
    );
  }

  const images = product.images || [];
  const listedInfo = published || preview.alreadyListed;
  const awaitingCallback =
    (paymentResult === "success" || preview.pendingPayment?.status === "paid") &&
    !listedInfo;
  const pendingCheckout =
    preview.pendingPayment?.status === "pending" ? preview.pendingPayment : null;
  const failedPaidPayment =
    preview.pendingPayment?.status === "publish_failed" && !listedInfo;

  return (
    <div className="etsy-page">
      <div className="etsy-page-header">
        <Link href="/admin/products" className="etsy-back-link">
          <ArrowLeft size={16} />
          {isKa ? "პროდუქტებზე დაბრუნება" : "Back to products"}
        </Link>
        <h1>
          <Store size={22} />
          {isKa ? "Etsy-ზე განთავსება" : "Publish to Etsy"}
        </h1>
      </div>

      <div className="etsy-page-grid">
        {/* ─────────── LEFT: Etsy-style listing preview ─────────── */}
        <div className="etsy-preview-col">
          <div className="etsy-preview-badge">
            {isKa
              ? "✨ ასე გამოჩნდება თქვენი ნამუშევარი Etsy-ზე"
              : "✨ This is how your artwork will look on Etsy"}
          </div>

          <div className="etsy-mock">
            {/* Browser chrome */}
            <div className="etsy-mock-chrome">
              <span className="etsy-mock-dot red" />
              <span className="etsy-mock-dot yellow" />
              <span className="etsy-mock-dot green" />
              <div className="etsy-mock-url">
                etsy.com/listing/…/{(preview.listing.title || "artwork")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .slice(0, 32)}
              </div>
            </div>

            <div className="etsy-mock-body">
              {/* Gallery */}
              <div className="etsy-mock-gallery">
                {images.length > 1 && (
                  <div className="etsy-mock-thumbs">
                    {images.slice(0, 6).map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={img}
                        src={img}
                        alt=""
                        className={i === mainImage ? "active" : ""}
                        onClick={() => setMainImage(i)}
                      />
                    ))}
                  </div>
                )}
                <div className="etsy-mock-main-img">
                  {images[mainImage] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[mainImage]} alt={product.name} />
                  ) : (
                    <div className="etsy-mock-noimg">🖼️</div>
                  )}
                </div>
              </div>

              {/* Buy box */}
              <div className="etsy-mock-buybox">
                <div className="etsy-mock-shop">
                  <span className="etsy-mock-shopname">SoulArt</span>
                  <span className="etsy-mock-stars">
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                  </span>
                </div>

                <h2 className="etsy-mock-title">
                  {preview.listing.title ||
                    product.nameEn ||
                    product.name}
                </h2>

                <div className="etsy-mock-price">
                  ${preview.pricing.priceUsd.toFixed(2)}
                </div>
                <div className="etsy-mock-shipping">
                  {isKa
                    ? "+ მიწოდება · იგზავნება საქართველოდან"
                    : "+ shipping · Ships from Georgia"}
                </div>

                <button className="etsy-mock-cart" disabled>
                  Add to cart
                </button>

                <div className="etsy-mock-signals">
                  <span>🎨 Original artwork</span>
                  <span>🇬🇪 Handmade in Georgia</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="etsy-mock-desc">
              <h3>{isKa ? "აღწერა (ინგლისურად)" : "Description"}</h3>
              <p>{preview.listing.description}</p>
            </div>

            {/* Tags */}
            {preview.listing.tags.length > 0 && (
              <div className="etsy-mock-tags">
                {preview.listing.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            )}

            {preview.listing.taxonomyPath && (
              <div className="etsy-mock-category">
                {isKa ? "კატეგორია Etsy-ზე: " : "Etsy category: "}
                <strong>{preview.listing.taxonomyPath}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ─────────── RIGHT: checkout ─────────── */}
        <div className="etsy-checkout-col">
          <div className="etsy-checkout-card">
            <h3 className="etsy-checkout-title">
              {isKa ? "განთავსების დეტალები" : "Checkout details"}
            </h3>

            {/* Success / already listed */}
            {listedInfo && (
              <div className="etsy-checkout-success">
                <p>
                  ✅{" "}
                  {listedInfo.state === "active"
                    ? isKa
                      ? "ნამუშევარი გამოქვეყნებულია Etsy-ზე!"
                      : "Your artwork is live on Etsy!"
                    : isKa
                      ? "ნამუშევარი Etsy-ზეა დრაფტის სახით — მალე გააქტიურდება."
                      : "Uploaded to Etsy as a draft — will be activated soon."}
                </p>
                {listedInfo.listingUrl && (
                  <a
                    href={listedInfo.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={15} />
                    {isKa ? "ნახე Etsy-ზე" : "View on Etsy"}
                  </a>
                )}
              </div>
            )}

            {awaitingCallback && (
              <div className="etsy-checkout-pending">
                <p>
                  ⏳{" "}
                  {isKa
                    ? "გადახდა მიღებულია — ნამუშევარი ქვეყნდება Etsy-ზე. ამას შეიძლება 1-2 წუთი დასჭირდეს."
                    : "Payment received — your artwork is being published. This can take a minute or two."}
                </p>
                <button onClick={loadData} disabled={loading}>
                  <RefreshCw size={14} />
                  {isKa ? "სტატუსის განახლება" : "Refresh status"}
                </button>
              </div>
            )}

            {!listedInfo && !awaitingCallback && (
              <>
                {/* Price breakdown */}
                <div className="etsy-checkout-rows">
                  <div className="etsy-checkout-row">
                    <span>{isKa ? "თქვენი ფასი" : "Your price"}</span>
                    <span>{preview.pricing.priceGel}₾</span>
                  </div>
                  <div className="etsy-checkout-row">
                    <span>
                      {isKa
                        ? `+ Etsy საკომისიო (${preview.pricing.commissionPercent}%)`
                        : `+ Etsy commission (${preview.pricing.commissionPercent}%)`}
                    </span>
                    <span>
                      {preview.pricing.priceWithCommissionGel.toFixed(2)}₾
                    </span>
                  </div>
                  <div className="etsy-checkout-row highlight">
                    <span>
                      {isKa ? "ფასი Etsy-ზე (USD)" : "Etsy price (USD)"}
                    </span>
                    <span>${preview.pricing.priceUsd.toFixed(2)}</span>
                  </div>
                  <div className="etsy-checkout-row">
                    <span>
                      {isKa
                        ? `შემოსავალი გაყიდვისას (−${preview.pricing.soulartCommissionPercent}% SoulArt)`
                        : `Earnings when sold (−${preview.pricing.soulartCommissionPercent}% SoulArt)`}
                    </span>
                    <span>{preview.pricing.sellerEarnsGel.toFixed(2)}₾</span>
                  </div>
                  <div className="etsy-checkout-row">
                    <span>{isKa ? "Listing-ის საფასური" : "Listing fee"}</span>
                    <span className="fee">
                      {preview.pricing.listingFeeGel}₾
                    </span>
                  </div>
                  {preview.pricing.sellerBalanceGel !== null && (
                    <div className="etsy-checkout-row">
                      <span>{isKa ? "თქვენი ბალანსი" : "Your balance"}</span>
                      <span>
                        {preview.pricing.sellerBalanceGel.toFixed(2)}₾
                      </span>
                    </div>
                  )}
                </div>

                <div className="etsy-checkout-note">
                  💡{" "}
                  {isKa
                    ? `Etsy იღებს საკომისიოებს გაყიდვასა და ვალუტის კონვერტაციაზე — ამიტომ Etsy-ზე ფასი თქვენს ფასზე მეტია. გაყიდვისას მიიღებთ იმდენივეს, რამდენსაც SoulArt-ზე გაყიდვისას.`
                    : `Etsy charges sale and currency-conversion fees — that's why the Etsy price is higher than yours. When it sells, you earn the same as on a SoulArt sale.`}
                </div>

                {/* Blockers */}
                {preview.blockers.length > 0 && (
                  <div className="etsy-checkout-blockers">
                    {preview.blockers.map((b) => (
                      <p key={b}>
                        <AlertTriangle size={13} />
                        {BLOCKER_MESSAGES[b]
                          ? isKa
                            ? BLOCKER_MESSAGES[b].ka
                            : BLOCKER_MESSAGES[b].en
                          : b}
                      </p>
                    ))}
                  </div>
                )}

                {/* Fee captured but publish failed — admin retry pending */}
                {failedPaidPayment && (
                  <div className="etsy-checkout-blockers">
                    <p>
                      <AlertTriangle size={13} />
                      {isKa
                        ? "საფასური გადახდილია, მაგრამ Etsy-ზე გამოქვეყნება ვერ მოხერხდა. ხელახლა გადახდა საჭირო არ არის — ადმინისტრატორი გაასწორებს და listing-ი ავტომატურად გამოქვეყნდება."
                        : "The fee is paid, but publishing to Etsy failed. No need to pay again — an admin will fix the issue and the listing will be published automatically."}
                    </p>
                  </div>
                )}

                {/* Pending checkout — previous payment session still open */}
                {pendingCheckout && (
                  <div className="etsy-checkout-countdown">
                    <p>
                      ⏳{" "}
                      {isKa
                        ? "ამ ნამუშევრისთვის გადახდის სესია უკვე გახსნილია. თუ გადახდას არ დაასრულებთ, სესია გაუქმდება და ხელახლა ცდას შეძლებთ:"
                        : "A payment session for this artwork is already open. If you don't complete it, the session will be cancelled and you can retry in:"}
                    </p>
                    <div className="etsy-countdown-timer">
                      {formatCountdown(countdown ?? 0)}
                    </div>
                    <button onClick={loadData} disabled={loading}>
                      <RefreshCw size={14} />
                      {isKa ? "სტატუსის განახლება" : "Refresh status"}
                    </button>
                  </div>
                )}

                {/* Payment buttons */}
                {pendingCheckout || failedPaidPayment ? null : preview.pricing
                    .listingFeeGel > 0 ? (
                  <div className="etsy-checkout-actions">
                    <button
                      className="etsy-btn-primary"
                      onClick={handleBalancePay}
                      disabled={
                        publishing ||
                        !preview.ready ||
                        !preview.pricing.canPayFromBalance
                      }
                    >
                      {publishing ? (
                        <Loader2 size={17} className="etsy-spin" />
                      ) : (
                        <Wallet size={17} />
                      )}
                      {isKa
                        ? `ბალანსიდან გადახდა — ${preview.pricing.listingFeeGel}₾`
                        : `Pay from balance — ${preview.pricing.listingFeeGel}₾`}
                    </button>
                    {!preview.pricing.canPayFromBalance && (
                      <p className="etsy-checkout-hint">
                        {isKa
                          ? "ბალანსზე საკმარისი თანხა არ არის — გადაიხადეთ ბარათით"
                          : "Not enough balance — pay by card instead"}
                      </p>
                    )}
                    <button
                      className="etsy-btn-card"
                      onClick={handleCardPay}
                      disabled={publishing || !preview.ready}
                    >
                      {publishing ? (
                        <Loader2 size={17} className="etsy-spin" />
                      ) : (
                        <CreditCard size={17} />
                      )}
                      {isKa
                        ? `ბარათით გადახდა — ${preview.pricing.listingFeeGel}₾`
                        : `Pay by card — ${preview.pricing.listingFeeGel}₾`}
                    </button>
                    <p className="etsy-checkout-note small">
                      {isKa
                        ? "გადახდის შემდეგ ნამუშევარი ავტომატურად გამოქვეყნდება Etsy-ზე"
                        : "After payment your artwork is published to Etsy automatically"}
                    </p>
                  </div>
                ) : (
                  <div className="etsy-checkout-actions">
                    <button
                      className="etsy-btn-primary"
                      onClick={handleBalancePay}
                      disabled={publishing || !preview.ready}
                    >
                      {publishing ? (
                        <Loader2 size={17} className="etsy-spin" />
                      ) : (
                        <Store size={17} />
                      )}
                      {isKa ? "განთავსება Etsy-ზე" : "Publish to Etsy"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EtsyPublishPage() {
  return (
    <Suspense fallback={null}>
      <EtsyPublishContent />
    </Suspense>
  );
}
