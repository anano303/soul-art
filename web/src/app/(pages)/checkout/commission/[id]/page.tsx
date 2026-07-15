"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Loader2, Truck } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { BOGButton } from "@/modules/orders/components/bog-button";
import { CredoInstallmentButton } from "@/modules/orders/components/credo-installment-button";
import {
  Commission,
  CommissionOfferView,
  COMMISSION_TYPE_LABELS,
  selectOffer,
  getCommission,
} from "@/modules/commissions/api/commissions-api";
import "./commission-checkout.css";

function CommissionCheckout() {
  const { language } = useLanguage();
  const { user, isLoading: authLoading } = useUser();
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const commissionId = params.id as string;
  const offerId = search?.get("offerId") || "";

  const [commission, setCommission] = useState<Commission | null>(null);
  const [offer, setOffer] = useState<CommissionOfferView | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const selectedRef = useRef(false);

  const fmt = (n: number) => `${n.toFixed(2)} ₾`;

  const load = useCallback(async () => {
    try {
      const c = await getCommission(commissionId);
      setCommission(c);
      const found = (c.offers || []).find((o) => o._id === offerId);
      if (!found) {
        toast({
          title:
            language === "en" ? "Offer not found" : "შეთავაზება ვერ მოიძებნა",
          variant: "destructive",
        });
        router.push("/commissions");
        return;
      }
      setOffer(found);

      // Create (or reuse) the pending order so we can use the standard
      // BOG / Credo installment payment buttons.
      if (!selectedRef.current) {
        selectedRef.current = true;
        const sel = await selectOffer(commissionId, offerId);
        setOrderId(sel.orderId);
      }
    } catch (err) {
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
      router.push("/commissions");
    } finally {
      setLoading(false);
    }
  }, [commissionId, offerId, router, language]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(
        `/login?redirect=/checkout/commission/${commissionId}?offerId=${offerId}`
      );
      return;
    }
    load();
  }, [authLoading, user, load, router, commissionId, offerId]);

  if (loading || authLoading) {
    return (
      <div className="cmc-container">
        <div className="cmc-loading">
          <Loader2 className="cmc-spin" size={40} />
        </div>
      </div>
    );
  }

  if (!commission || !offer) return null;

  const label =
    language === "en"
      ? COMMISSION_TYPE_LABELS[commission.type].en
      : COMMISSION_TYPE_LABELS[commission.type].ge;
  const ship = commission.shippingDetails;
  const artistHref = offer.artistSlug
    ? `/@${offer.artistSlug}`
    : offer.artistId
    ? `/artists/${offer.artistId}`
    : null;

  return (
    <div className="cmc-container">
      <Link href="/commissions" className="cmc-back">
        <ArrowLeft size={18} />
        {language === "en" ? "Back" : "უკან"}
      </Link>
      <h1 className="cmc-title">
        {language === "en" ? "Complete your order" : "შეკვეთის დასრულება"}
      </h1>

      <div className="cmc-grid">
        {/* Summary */}
        <div className="cmc-card">
          <div className="cmc-item">
            <div className="cmc-thumb">
              {commission.referenceImages?.[0] && (
                <Image
                  src={commission.referenceImages[0]}
                  alt={label}
                  fill
                  sizes="90px"
                  style={{ objectFit: "cover" }}
                />
              )}
            </div>
            <div>
              <h3 className="cmc-item-title">
                {label} — {commission.size}
              </h3>
              <p className="cmc-artist">
                🎨{" "}
                {artistHref ? (
                  <Link href={artistHref} className="cmc-artist-link">
                    {offer.artistName}
                  </Link>
                ) : (
                  offer.artistName
                )}
              </p>
              <p className="cmc-days">
                ⏱ {offer.estimatedDays} {language === "en" ? "days" : "დღე"}
              </p>
            </div>
          </div>

          <div className="cmc-prices">
            <div className="cmc-row">
              <span>{language === "en" ? "Artwork" : "ნამუშევარი"}</span>
              <span>{fmt(offer.price)}</span>
            </div>
            <div className="cmc-row">
              <span>
                <Truck size={14} />{" "}
                {language === "en"
                  ? "Delivery (by artist)"
                  : "მიწოდება (მხატვრისგან)"}
              </span>
              <span>{fmt(offer.deliveryPrice)}</span>
            </div>
            <div className="cmc-note">
              {language === "en"
                ? "No extra SoulArt delivery fee — delivery is included in the artist's price."
                : "SoulArt-ის დამატებითი მიწოდების საფასური არ ერიცხება — მიწოდება მხატვრის ფასშია ჩათვლილი."}
            </div>
            <div className="cmc-row cmc-total">
              <span>{language === "en" ? "Total" : "სულ"}</span>
              <span>{fmt(offer.totalPrice)}</span>
            </div>
          </div>

          {ship?.address && (
            <div className="cmc-address">
              📍 {ship.address}, {ship.city}
              {ship.postalCode ? `, ${ship.postalCode}` : ""}
              {ship.phoneNumber ? ` · ${ship.phoneNumber}` : ""}
            </div>
          )}
        </div>

        {/* Payment (existing buttons) */}
        <div className="cmc-card">
          <h2 className="cmc-subtitle">
            {language === "en" ? "Choose payment method" : "აირჩიე გადახდის მეთოდი"}
          </h2>

          {orderId ? (
            <div className="cmc-methods">
              <BOGButton orderId={orderId} amount={offer.totalPrice} />
              {offer.totalPrice >= 100 ? (
                <CredoInstallmentButton
                  orderId={orderId}
                  items={[
                    {
                      productId: commissionId,
                      name: `${label} — ${commission.size}`,
                      qty: 1,
                      price: offer.totalPrice,
                    },
                  ]}
                />
              ) : (
                <p className="cmc-note">
                  {language === "en"
                    ? "Installment is available for orders of 100 ₾ or more."
                    : "განვადება ხელმისაწვდომია 100 ₾-დან."}
                </p>
              )}
            </div>
          ) : (
            <div className="cmc-loading">
              <Loader2 className="cmc-spin" size={28} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommissionCheckoutPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
      <CommissionCheckout />
    </Suspense>
  );
}
