"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  Commission,
  CommissionOfferView,
  COMMISSION_TYPE_LABELS,
  confirmReceived,
  getCommission,
  getMyCommissions,
} from "@/modules/commissions/api/commissions-api";
import "./commissions.css";

export default function MyCommissionsPage() {
  const { language } = useLanguage();
  const { user, isLoading } = useUser();
  const [items, setItems] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [offers, setOffers] = useState<CommissionOfferView[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const router = useRouter();

  const label = (c: Commission) =>
    language === "en"
      ? COMMISSION_TYPE_LABELS[c.type].en
      : COMMISSION_TYPE_LABELS[c.type].ge;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getMyCommissions());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  const toggleOffers = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setLoadingOffers(true);
    try {
      const c = await getCommission(id);
      setOffers(c.offers || []);
    } catch {
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Selecting an offer takes the buyer to the checkout page (where they pick
  // full payment vs. installment), mirroring the auction checkout flow.
  const handleSelect = (commissionId: string, offerId: string) => {
    router.push(`/checkout/commission/${commissionId}?offerId=${offerId}`);
  };

  const handleConfirmReceived = async (commissionId: string) => {
    if (
      !confirm(
        language === "en"
          ? "Confirm you received the artwork? The artist will be paid."
          : "დაადასტურე რომ მიიღე ნამუშევარი? მხატვარს ჩაერიცხება თანხა."
      )
    )
      return;
    setConfirmingId(commissionId);
    try {
      await confirmReceived(commissionId);
      toast({
        title: language === "en" ? "Confirmed. Thank you!" : "დადასტურდა. მადლობა!",
      });
      await load();
    } catch (err) {
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setConfirmingId(null);
    }
  };

  if (!isLoading && !user) {
    return (
      <div className="commission-page">
        <div className="commission-empty">
          <p>
            {language === "en"
              ? "Please log in to view your commissions."
              : "შესვლა საჭიროა შენი შეკვეთების სანახავად."}
          </p>
          <Link href="/login?redirect=/commissions" className="commission-submit" style={{ display: "inline-block", width: "auto", padding: "0.6rem 2rem" }}>
            {language === "en" ? "Log in" : "შესვლა"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="commission-page">
      <div className="commission-container" style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <h1 className="commission-h1">
            {language === "en" ? "My commissions" : "ჩემი შეკვეთები"}
          </h1>
          <Link href="/commissions/new" className="commission-submit" style={{ width: "auto", margin: 0, padding: "0.6rem 1.6rem" }}>
            + {language === "en" ? "New order" : "ახალი შეკვეთა"}
          </Link>
        </div>

        {loading ? (
          <div className="commission-empty">
            {language === "en" ? "Loading…" : "იტვირთება…"}
          </div>
        ) : items.length === 0 ? (
          <div className="commission-empty">
            <p>
              {language === "en"
                ? "You have no commissions yet."
                : "ჯერ არ გაქვს შეკვეთები."}
            </p>
          </div>
        ) : (
          <div className="commission-list" style={{ marginTop: "1.5rem" }}>
            {items.map((c) => {
              const canSelect =
                c.status === "open" || c.status === "selecting";
              return (
                <div key={c._id} className="commission-card">
                  <div className="commission-card-head">
                    <div className="commission-thumb">
                      {c.referenceImages?.[0] && (
                        <Image
                          src={c.referenceImages[0]}
                          alt={label(c)}
                          fill
                          sizes="90px"
                          style={{ objectFit: "cover" }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <strong>{label(c)}</strong>
                        <span className={`commission-badge ${c.status}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="offer-meta">
                        <span>📐 {c.size}</span>
                        {c.material && <span>🎨 {c.material}</span>}
                        {c.budget ? <span>💰 {c.budget} ₾</span> : null}
                      </div>
                      <p style={{ color: "#4b5563", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        {c.description}
                      </p>
                      {c.selectedOffer && (
                        <p style={{ marginTop: "0.5rem", fontWeight: 600, color: "#012645" }}>
                          {language === "en" ? "Chosen artist" : "არჩეული მხატვარი"}:{" "}
                          {c.selectedOffer.artistName} — {c.selectedOffer.totalPrice} ₾
                        </p>
                      )}
                      {c.isPaid && (
                        <p
                          style={{
                            marginTop: "0.4rem",
                            display: "inline-block",
                            background: "#dcfce7",
                            color: "#166534",
                            fontWeight: 700,
                            borderRadius: "100px",
                            padding: "0.25rem 0.8rem",
                            fontSize: "0.85rem",
                          }}
                        >
                          ✅ {language === "en" ? "Paid" : "გადახდილია"}
                          {c.status === "completed"
                            ? language === "en"
                              ? " · Completed"
                              : " · დასრულებული"
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {c.isPaid && c.status !== "completed" && (
                    <button
                      className="commission-submit"
                      style={{ marginTop: "1rem" }}
                      disabled={confirmingId === c._id}
                      onClick={() => handleConfirmReceived(c._id)}
                    >
                      {confirmingId === c._id
                        ? "…"
                        : language === "en"
                        ? "✅ Confirm I received it"
                        : "✅ დავადასტურებ მიღებას"}
                    </button>
                  )}

                  {canSelect && !c.isPaid && (
                    <button
                      className="commission-upload-btn"
                      style={{ marginTop: "1rem" }}
                      onClick={() => toggleOffers(c._id)}
                    >
                      {expanded === c._id
                        ? language === "en"
                          ? "Hide offers"
                          : "შეთავაზებების დამალვა"
                        : language === "en"
                        ? "View offers"
                        : "შეთავაზებების ნახვა"}
                    </button>
                  )}

                  {expanded === c._id && (
                    <div style={{ marginTop: "0.5rem" }}>
                      {loadingOffers ? (
                        <p style={{ color: "#6b7280", padding: "0.5rem" }}>
                          {language === "en" ? "Loading offers…" : "იტვირთება…"}
                        </p>
                      ) : offers.length === 0 ? (
                        <p style={{ color: "#6b7280", padding: "0.5rem" }}>
                          {language === "en"
                            ? "No offers yet. Artists have 24h to respond."
                            : "ჯერ არ არის შეთავაზება. მხატვრებს 24სთ აქვთ."}
                        </p>
                      ) : (
                        offers.map((o) => (
                          <div key={o._id} className="offer-card">
                            <div>
                              <div style={{ fontWeight: 700, color: "#012645" }}>
                                {"⭐".repeat(Math.round(o.rating || 0)) || "☆"}{" "}
                                {o.artistSlug || o.artistId ? (
                                  <Link
                                    href={
                                      o.artistSlug
                                        ? `/@${o.artistSlug}`
                                        : `/artists/${o.artistId}`
                                    }
                                    style={{ color: "#02457a", textDecoration: "underline" }}
                                  >
                                    {o.artistName}
                                  </Link>
                                ) : (
                                  o.artistName
                                )}
                              </div>
                              <div className="offer-meta">
                                <span>⏱ {o.estimatedDays} {language === "en" ? "days" : "დღე"}</span>
                                <span>🚚 {o.deliveryPrice} ₾</span>
                                {typeof o.completedCommissions === "number" && (
                                  <span>✅ {o.completedCommissions} {language === "en" ? "done" : "შესრ."}</span>
                                )}
                                {o.completionRate != null && (
                                  <span>📈 {o.completionRate}%</span>
                                )}
                                {typeof o.avgResponseHours === "number" && (
                                  <span>💬 ~{o.avgResponseHours}{language === "en" ? "h" : "სთ"}</span>
                                )}
                              </div>
                              {o.message && (
                                <p style={{ fontSize: "0.85rem", color: "#4b5563", marginTop: "0.3rem" }}>
                                  “{o.message}”
                                </p>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div className="offer-total">{o.totalPrice} ₾</div>
                              <button
                                className="offer-select-btn"
                                style={{ marginTop: "0.4rem" }}
                                onClick={() => handleSelect(c._id, o._id)}
                              >
                                {language === "en" ? "Choose & pay" : "აირჩიე და გადაიხადე"}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
