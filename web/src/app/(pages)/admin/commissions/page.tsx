"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUserData } from "@/lib/auth";
import { useLanguage } from "@/hooks/LanguageContext";
import { toast } from "@/hooks/use-toast";
import {
  completeCommission,
  getAdminCommissions,
  COMMISSION_TYPE_LABELS,
  CommissionType,
} from "@/modules/commissions/api/commissions-api";
import "../../commissions/commissions.css";

interface AdminCommission {
  _id: string;
  type: CommissionType;
  size: string;
  status: string;
  description: string;
  material?: string;
  budget?: number;
  referenceImages?: string[];
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  shippingDetails?: {
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  selectedOffer?: {
    artistName?: string;
    price: number;
    deliveryPrice: number;
    totalPrice: number;
  };
  isPaid?: boolean;
  createdAt: string;
}

export default function AdminCommissionsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<AdminCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login?redirect=/admin/commissions");
      return;
    }
    const role = getUserData()?.role?.toLowerCase() || "";
    if (!role.includes("admin")) {
      router.push("/");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminCommissions();
      setItems((res.items as AdminCommission[]) || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked) load();
  }, [authChecked, load]);

  const handleComplete = async (id: string) => {
    if (
      !confirm(
        language === "en"
          ? "Mark this commission as completed? The artist will be paid."
          : "მონიშნო შესრულებულად? მხატვარს ჩაერიცხება თანხა."
      )
    )
      return;
    setCompleting(id);
    try {
      await completeCommission(id);
      toast({ title: language === "en" ? "Completed" : "დასრულდა" });
      await load();
    } catch (err) {
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setCompleting(null);
    }
  };

  const typeLabel = (t: CommissionType) =>
    language === "en" ? COMMISSION_TYPE_LABELS[t].en : COMMISSION_TYPE_LABELS[t].ge;

  if (!authChecked) {
    return <div className="commission-empty">იტვირთება...</div>;
  }

  return (
    <div className="commission-page">
      <div className="commission-container" style={{ maxWidth: 1000 }}>
        <h1 className="commission-h1">
          {language === "en" ? "Custom Orders" : "ინდივიდუალური შეკვეთები"}
        </h1>

        {loading ? (
          <div className="commission-empty">
            {language === "en" ? "Loading…" : "იტვირთება…"}
          </div>
        ) : items.length === 0 ? (
          <div className="commission-empty">
            {language === "en" ? "No commissions." : "შეკვეთები არ არის."}
          </div>
        ) : (
          <div className="commission-list">
            {items.map((c) => (
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
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{typeLabel(c.type)}</strong>
                      <span className={`commission-badge ${c.status}`}>{c.status}</span>
                    </div>
                    <div className="offer-meta">
                      <span>📐 {c.size}</span>
                      {c.material && <span>🎨 {c.material}</span>}
                      {c.budget ? <span>💰 {c.budget} ₾</span> : null}
                    </div>
                    <p style={{ color: "#4b5563", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                      {c.description}
                    </p>
                    <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#012645" }}>
                      <div>
                        👤 {c.requesterName} · {c.requesterEmail} · {c.requesterPhone}
                      </div>
                      {c.shippingDetails && (
                        <div>
                          📍 {c.shippingDetails.address}, {c.shippingDetails.city}{" "}
                          {c.shippingDetails.postalCode} {c.shippingDetails.country}
                        </div>
                      )}
                      {c.selectedOffer && (
                        <div style={{ fontWeight: 600, marginTop: "0.3rem" }}>
                          🎨 {c.selectedOffer.artistName} — {c.selectedOffer.price} ₾ +{" "}
                          {c.selectedOffer.deliveryPrice} ₾ = {c.selectedOffer.totalPrice} ₾{" "}
                          {c.isPaid ? "✓ გადახდილი" : "(გადაუხდელი)"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {c.isPaid && c.status !== "completed" && (
                  <button
                    className="commission-submit"
                    style={{ marginTop: "1rem" }}
                    disabled={completing === c._id}
                    onClick={() => handleComplete(c._id)}
                  >
                    {completing === c._id
                      ? language === "en" ? "…" : "…"
                      : language === "en" ? "Mark completed" : "დასრულებულად მონიშვნა"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
