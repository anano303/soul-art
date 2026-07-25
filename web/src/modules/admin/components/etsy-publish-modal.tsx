"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Store, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import "./etsy-publish-modal.css";

interface EtsyProduct {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  images?: string[];
}

interface EtsyPublishModalProps {
  product: EtsyProduct;
  isOpen: boolean;
  onClose: () => void;
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
    quantity: number;
    tags: string[];
    taxonomyPath: string | null;
    imageCount: number;
  };
  pricing: {
    priceGel: number;
    commissionPercent: number;
    priceWithCommissionGel: number;
    priceUsd: number;
    listingFeeGel: number;
    sellerBalanceGel: number | null;
  };
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
    ka: "Etsy ანგარიშზე მაღაზია ჯერ არ არის შექმნილი",
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
  INSUFFICIENT_BALANCE: {
    ka: "ბალანსზე არასაკმარისი თანხაა listing-ის საფასურისთვის",
    en: "Insufficient balance for the listing fee",
  },
};

export function EtsyPublishModal({
  product,
  isOpen,
  onClose,
}: EtsyPublishModalProps) {
  const { language } = useLanguage();
  const isKa = language !== "en";
  const productId = product._id || product.id;

  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState<EtsyPreview | null>(null);
  const [error, setError] = useState("");
  const [published, setPublished] = useState<{
    listingUrl?: string;
    state: string;
    priceUsd: number;
    feeCharged: boolean;
  } | null>(null);

  const loadPreview = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`/etsy/products/${productId}/preview`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load Etsy preview");
      }
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preview");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isOpen) {
      setPublished(null);
      setPreview(null);
      loadPreview();
    }
  }, [isOpen, loadPreview]);

  const handlePublish = async () => {
    if (!productId) return;
    setPublishing(true);
    try {
      const res = await fetchWithAuth(`/etsy/products/${productId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Publish failed");
      }
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

  if (!isOpen) return null;

  return createPortal(
    <div className="etsy-overlay" onClick={onClose}>
      <div className="etsy-modal" onClick={(e) => e.stopPropagation()}>
        <button className="etsy-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="etsy-header">
          <Store size={24} />
          <h2>{isKa ? "Etsy-ზე განთავსება" : "Publish to Etsy"}</h2>
        </div>

        <p className="etsy-product-name">🎨 {product.name}</p>

        {loading && (
          <div className="etsy-loading">
            <Loader2 size={22} className="spin" />
            <span>{isKa ? "იტვირთება..." : "Loading..."}</span>
          </div>
        )}

        {error && <div className="etsy-error">❌ {error}</div>}

        {/* Success state */}
        {published && (
          <div className="etsy-success">
            <p>
              ✅{" "}
              {published.state === "active"
                ? isKa
                  ? "ნამუშევარი წარმატებით გამოქვეყნდა Etsy-ზე!"
                  : "Your artwork is now live on Etsy!"
                : isKa
                  ? "ნამუშევარი აიტვირთა Etsy-ზე დრაფტის სახით — ადმინი მალე გაააქტიურებს."
                  : "Uploaded to Etsy as a draft — an admin will activate it soon."}
            </p>
            {published.listingUrl && (
              <a
                href={published.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="etsy-listing-link"
              >
                <ExternalLink size={16} />
                {isKa ? "ნახე Etsy-ზე" : "View on Etsy"}
              </a>
            )}
          </div>
        )}

        {/* Already listed */}
        {!published && preview?.alreadyListed && (
          <div className="etsy-info-box">
            <p>
              ℹ️{" "}
              {isKa
                ? "ეს პროდუქტი უკვე განთავსებულია Etsy-ზე."
                : "This product is already listed on Etsy."}
            </p>
            {preview.alreadyListed.listingUrl && (
              <a
                href={preview.alreadyListed.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="etsy-listing-link"
              >
                <ExternalLink size={16} />
                {isKa ? "ნახე Etsy-ზე" : "View on Etsy"}
              </a>
            )}
          </div>
        )}

        {!published && preview && !preview.alreadyListed && (
          <>
            {/* Fee explanation */}
            <div className="etsy-fee-explainer">
              <p>
                💡{" "}
                {isKa
                  ? `Etsy-ზე განთავსება ფასიანია: ერთჯერადი ${preview.pricing.listingFeeGel}₾ listing-ის საფასური (ჩამოგეჭრებათ ბალანსიდან). Etsy ასევე იღებს საკომისიოებს გაყიდვაზე და ვალუტის კონვერტაციაზე — ამიტომ Etsy-ზე ფასი თქვენს ფასზე ${preview.pricing.commissionPercent}%-ით მეტი იქნება. თქვენ გაყიდვისას მიიღებთ თქვენს სრულ ფასს.`
                  : `Publishing on Etsy has costs: a one-time ${preview.pricing.listingFeeGel}₾ listing fee (deducted from your balance). Etsy also charges sale and currency-conversion fees — so the Etsy price will be ${preview.pricing.commissionPercent}% above your price. You still receive your full price when it sells.`}
              </p>
            </div>

            {/* Pricing breakdown */}
            <div className="etsy-section">
              <label className="etsy-label">
                {isKa ? "💰 ფასი Etsy-ზე" : "💰 Etsy pricing"}
              </label>
              <div className="etsy-price-rows">
                <div className="etsy-price-row">
                  <span>{isKa ? "თქვენი ფასი" : "Your price"}</span>
                  <span>{preview.pricing.priceGel}₾</span>
                </div>
                <div className="etsy-price-row">
                  <span>
                    {isKa
                      ? `+ Etsy საკომისიო (${preview.pricing.commissionPercent}%)`
                      : `+ Etsy commission (${preview.pricing.commissionPercent}%)`}
                  </span>
                  <span>{preview.pricing.priceWithCommissionGel}₾</span>
                </div>
                <div className="etsy-price-row etsy-price-final">
                  <span>{isKa ? "ფასი Etsy-ზე (USD)" : "Etsy price (USD)"}</span>
                  <span>${preview.pricing.priceUsd}</span>
                </div>
                <div className="etsy-price-row">
                  <span>
                    {isKa ? "Listing-ის საფასური" : "Listing fee"}
                  </span>
                  <span>{preview.pricing.listingFeeGel}₾</span>
                </div>
                {preview.pricing.sellerBalanceGel !== null && (
                  <div className="etsy-price-row">
                    <span>{isKa ? "თქვენი ბალანსი" : "Your balance"}</span>
                    <span>{preview.pricing.sellerBalanceGel}₾</span>
                  </div>
                )}
              </div>
            </div>

            {/* Listing preview */}
            <div className="etsy-section">
              <label className="etsy-label">
                {isKa ? "📋 Listing-ის დეტალები" : "📋 Listing details"}
              </label>
              <div className="etsy-preview-details">
                <p>
                  <strong>{isKa ? "სათაური:" : "Title:"}</strong>{" "}
                  {preview.listing.title}
                </p>
                {preview.listing.taxonomyPath && (
                  <p>
                    <strong>{isKa ? "კატეგორია:" : "Category:"}</strong>{" "}
                    {preview.listing.taxonomyPath}
                  </p>
                )}
                <p>
                  <strong>{isKa ? "ფოტოები:" : "Images:"}</strong>{" "}
                  {preview.listing.imageCount}
                  {" · "}
                  <strong>{isKa ? "რაოდენობა:" : "Quantity:"}</strong>{" "}
                  {preview.listing.quantity}
                </p>
                {preview.listing.tags.length > 0 && (
                  <p className="etsy-tags">
                    {preview.listing.tags.map((t) => (
                      <span key={t} className="etsy-tag">
                        {t}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </div>

            {/* Blockers */}
            {preview.blockers.length > 0 && (
              <div className="etsy-blockers">
                {preview.blockers.map((b) => (
                  <p key={b}>
                    <AlertTriangle size={14} />{" "}
                    {BLOCKER_MESSAGES[b]
                      ? isKa
                        ? BLOCKER_MESSAGES[b].ka
                        : BLOCKER_MESSAGES[b].en
                      : b}
                  </p>
                ))}
              </div>
            )}

            {/* Publish button */}
            <button
              className="etsy-submit-btn"
              onClick={handlePublish}
              disabled={publishing || !preview.ready}
            >
              {publishing ? (
                <>
                  <Loader2 size={18} className="spin" />
                  {isKa ? "ქვეყნდება Etsy-ზე..." : "Publishing to Etsy..."}
                </>
              ) : (
                <>
                  <Store size={18} />
                  {isKa
                    ? `განთავსება — ${preview.pricing.listingFeeGel}₾`
                    : `Publish — ${preview.pricing.listingFeeGel}₾`}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
