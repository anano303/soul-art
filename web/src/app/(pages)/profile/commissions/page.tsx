"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import {
  Commission,
  COMMISSION_RATE_PERCENT,
  COMMISSION_TYPE_LABELS,
  CommissionType,
  getAvailableCommissions,
  getMyOffers,
  MyOfferView,
  submitOffer,
} from "@/modules/commissions/api/commissions-api";
import "../../commissions/commissions.css";

interface AvailableItem extends Commission {
  offersCount?: number;
  isDirect?: boolean;
  deliveryCity?: string;
  deliveryCountry?: string;
  buyerPaidCount?: number;
  buyerAbandonedCount?: number;
  buyerTrust?: "trusted" | "risky" | "new";
  myOffer?: {
    price: number;
    deliveryPrice: number;
    estimatedDays: number;
    message?: string;
  } | null;
}

export default function ArtistCommissionsPage() {
  const { language } = useLanguage();
  const { user, isLoading } = useUser();
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [available, setAvailable] = useState<AvailableItem[]>([]);
  const [myOffers, setMyOffers] = useState<MyOfferView[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<
    Record<string, { price: string; deliveryPrice: string; days: string; message: string }>
  >({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const typeLabel = (t: CommissionType) =>
    language === "en" ? COMMISSION_TYPE_LABELS[t].en : COMMISSION_TYPE_LABELS[t].ge;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [av, mo] = await Promise.all([
        getAvailableCommissions().catch(() => []),
        getMyOffers().catch(() => []),
      ]);
      setAvailable(av as AvailableItem[]);
      setMyOffers(mo);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  const setField = (id: string, key: string, value: string) => {
    setForm((prev) => {
      const base = prev[id] || {
        price: "",
        deliveryPrice: "",
        days: "",
        message: "",
      };
      return { ...prev, [id]: { ...base, [key]: value } };
    });
  };

  const handleSubmit = async (id: string) => {
    const f = form[id];
    if (!f || !f.price || !f.days) {
      toast({
        title: language === "en" ? "Fill price & days" : "შეავსე ფასი და ვადა",
        variant: "destructive",
      });
      return;
    }
    setSubmittingId(id);
    try {
      await submitOffer(id, {
        price: Number(f.price),
        deliveryPrice: Number(f.deliveryPrice || 0),
        estimatedDays: Number(f.days),
        message: f.message?.trim() || undefined,
      });
      toast({
        title: language === "en" ? "Offer sent!" : "შეთავაზება გაიგზავნა!",
      });
      await load();
    } catch (err) {
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="commission-page">
      <div className="commission-container" style={{ maxWidth: 900 }}>
        <h1 className="commission-h1">
          {language === "en" ? "Custom orders" : "ინდივიდუალური შეკვეთები"}
        </h1>

        <div className="commission-info-banner">
          🚚{" "}
          {language === "en"
            ? "You are responsible for delivery — set the delivery price by the buyer's city and add it to your offer."
            : "მიწოდებას შენ უზრუნველყოფ — მიუთითე მიწოდების ფასი მყიდველის ქალაქის მიხედვით და დაამატე შეთავაზებაში."}{" "}
          {" • "}
          💰{" "}
          {language === "en"
            ? `SoulArt commission on custom orders is ${COMMISSION_RATE_PERCENT}% (single payment and installment). Delivery is fully yours.`
            : `SoulArt-ის საკომისიო ინდ. შეკვეთებზე ${COMMISSION_RATE_PERCENT}%-ია (ერთიან და განვადებით გადახდაზე). მიწოდების თანხა სრულად შენია.`}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <button
            className={`commission-type-chip ${tab === "available" ? "active" : ""}`}
            onClick={() => setTab("available")}
          >
            {language === "en" ? "Available" : "ხელმისაწვდომი"}
          </button>
          <button
            className={`commission-type-chip ${tab === "mine" ? "active" : ""}`}
            onClick={() => setTab("mine")}
          >
            {language === "en" ? "My offers" : "ჩემი შეთავაზებები"}
          </button>
        </div>

        {loading ? (
          <div className="commission-empty">
            {language === "en" ? "Loading…" : "იტვირთება…"}
          </div>
        ) : tab === "available" ? (
          available.length === 0 ? (
            <div className="commission-empty">
              {language === "en"
                ? "No open requests right now."
                : "ამჟამად ღია შეკვეთები არ არის."}
            </div>
          ) : (
            <div className="commission-list">
              {available.map((c) => {
                const f = form[c._id] || { price: "", deliveryPrice: "", days: "", message: "" };
                return (
                  <div key={c._id} className="commission-card">
                    <div className="commission-card-head">
                      <div className="commission-thumb">
                        {c.referenceImages?.[0] && (
                          <Image
                            src={c.referenceImages[0]}
                            alt={typeLabel(c.type)}
                            fill
                            sizes="90px"
                            style={{ objectFit: "cover" }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                          <strong>{typeLabel(c.type)}</strong>
                          {c.isDirect && (
                            <span className="commission-badge selecting">
                              🎯 {language === "en" ? "Direct to you" : "პირდაპირ შენთვის"}
                            </span>
                          )}
                          {c.buyerTrust === "trusted" && (
                            <span className="commission-badge completed">
                              🟢{" "}
                              {language === "en"
                                ? `Reliable buyer (${c.buyerPaidCount} paid)`
                                : `სანდო მყიდველი (${c.buyerPaidCount} გადახდილი)`}
                            </span>
                          )}
                          {c.buyerTrust === "risky" && (
                            <span className="commission-badge expired">
                              🔴{" "}
                              {language === "en"
                                ? "Unreliable — didn't pay before"
                                : "არასანდო — ადრე არ გადაუხდია"}
                            </span>
                          )}
                          {c.buyerTrust === "new" && (
                            <span className="commission-badge open">
                              ⚪ {language === "en" ? "New buyer" : "ახალი მყიდველი"}
                            </span>
                          )}
                        </div>
                        <div className="offer-meta">
                          <span>📐 {c.size}</span>
                          {c.material && <span>🎨 {c.material}</span>}
                          {c.budget ? <span>💰 {c.budget} ₾</span> : null}
                          {c.deliveryCity && (
                            <span>🚚 {language === "en" ? "Deliver to" : "მიწოდება"}: {c.deliveryCity}</span>
                          )}
                        </div>
                        <p style={{ color: "#4b5563", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                          {c.description}
                        </p>
                      </div>
                    </div>

                    {c.myOffer ? (
                      <p style={{ marginTop: "1rem", color: "#166534", fontWeight: 600 }}>
                        ✓ {language === "en" ? "Your offer" : "შენი შეთავაზება"}:{" "}
                        {c.myOffer.price} ₾ · {c.myOffer.estimatedDays}{" "}
                        {language === "en" ? "days" : "დღე"}
                        {" "}({language === "en" ? "you can update below" : "შეგიძლია განაახლო"})
                      </p>
                    ) : null}

                    <div className="commission-row" style={{ marginTop: "1rem" }}>
                      <div>
                        <label className="commission-label">
                          {language === "en" ? "Price (₾) *" : "ფასი (₾) *"}
                        </label>
                        <input
                          className="commission-input"
                          type="number"
                          value={f.price}
                          onChange={(e) => setField(c._id, "price", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="commission-label">
                          {language === "en" ? "Delivery price (₾)" : "მიწოდების ფასი (₾)"}
                        </label>
                        <input
                          className="commission-input"
                          type="number"
                          value={f.deliveryPrice}
                          onChange={(e) => setField(c._id, "deliveryPrice", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="commission-row">
                      <div>
                        <label className="commission-label">
                          {language === "en" ? "Days to finish *" : "დასრულების დღეები *"}
                        </label>
                        <input
                          className="commission-input"
                          type="number"
                          value={f.days}
                          onChange={(e) => setField(c._id, "days", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="commission-label">
                          {language === "en" ? "Comment" : "კომენტარი"}
                        </label>
                        <input
                          className="commission-input"
                          value={f.message}
                          onChange={(e) => setField(c._id, "message", e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      className="commission-submit"
                      style={{ marginTop: "1rem" }}
                      disabled={submittingId === c._id}
                      onClick={() => handleSubmit(c._id)}
                    >
                      {submittingId === c._id
                        ? language === "en" ? "Sending…" : "იგზავნება…"
                        : c.myOffer
                        ? language === "en" ? "Update offer" : "შეთავაზების განახლება"
                        : language === "en" ? "Submit offer" : "შეთავაზების გაგზავნა"}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : myOffers.length === 0 ? (
          <div className="commission-empty">
            {language === "en" ? "You haven't made offers yet." : "ჯერ არ გაგიგზავნია შეთავაზება."}
          </div>
        ) : (
          <div className="commission-list">
            {myOffers.map((m) => (
              <div key={m._id} className="commission-card">
                <div className="commission-card-head">
                  <div className="commission-thumb">
                    {m.referenceImages?.[0] && (
                      <Image
                        src={m.referenceImages[0]}
                        alt={typeLabel(m.type)}
                        fill
                        sizes="90px"
                        style={{ objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{typeLabel(m.type)}</strong>
                      <span className={`commission-badge ${m.status}`}>{m.status}</span>
                      {m.selected && (
                        <span className="commission-badge completed">
                          {language === "en" ? "You were chosen 🎉" : "შენ აგირჩიეს 🎉"}
                        </span>
                      )}
                      {m.selected &&
                        (m.isPaid ? (
                          <span className="commission-badge completed">
                            ✅ {language === "en" ? "Paid" : "გადახდილია"}
                          </span>
                        ) : (
                          <span className="commission-badge selecting">
                            ⏳{" "}
                            {language === "en"
                              ? "Awaiting payment"
                              : "გადაუხდელია — ელოდება გადახდას"}
                          </span>
                        ))}
                    </div>
                    <div className="offer-meta">
                      <span>📐 {m.size}</span>
                      {m.myOffer && (
                        <>
                          <span>💰 {m.myOffer.price} ₾</span>
                          <span>⏱ {m.myOffer.estimatedDays} {language === "en" ? "days" : "დღე"}</span>
                          <span>🚚 {m.myOffer.deliveryPrice} ₾</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
