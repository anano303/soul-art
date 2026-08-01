"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import { toast } from "@/hooks/use-toast";
import {
  Commission,
  updateCommissionContact,
} from "@/modules/commissions/api/commissions-api";

interface ContactEditorProps {
  commission: Commission;
  onUpdated: (updated: Commission) => void;
}

/**
 * Buyer-facing contact + delivery details of their own commission.
 * Editable while the request is open; after an offer is picked the city is
 * frozen (the chosen artist quoted delivery for that city).
 */
export function ContactEditor({ commission, onUpdated }: ContactEditorProps) {
  const { language } = useLanguage();
  const en = language === "en";
  const s = commission.shippingDetails;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: s?.phoneNumber || "",
    address: s?.address || "",
    city: s?.city || "",
    postalCode: s?.postalCode || "",
  });

  const editable =
    commission.status === "open" || commission.status === "selecting";
  const cityLocked = commission.status === "selecting";

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.phone.trim() || !form.address.trim() || !form.city.trim()) {
      toast({
        title: en
          ? "Phone, address and city are required"
          : "ტელეფონი, მისამართი და ქალაქი სავალდებულოა",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCommissionContact(commission._id, {
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: cityLocked ? undefined : form.city.trim(),
        postalCode: form.postalCode.trim(),
      });
      toast({ title: en ? "Saved" : "შენახულია" });
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      toast({
        title: en ? "Error" : "შეცდომა",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        marginTop: "1rem",
        paddingTop: "0.85rem",
        borderTop: "1px solid #f1f1ee",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
          <div>📞 {s?.phoneNumber || "—"}</div>
          <div>
            📍 {s?.address || "—"}
            {s?.city ? `, ${s.city}` : ""}
            {s?.postalCode ? ` ${s.postalCode}` : ""}
          </div>
        </div>
        {editable && (
          <button
            type="button"
            className="commission-upload-btn"
            style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}
            onClick={() => setOpen((v) => !v)}
          >
            {open
              ? en
                ? "Cancel"
                : "გაუქმება"
              : en
              ? "Edit contact"
              : "კონტაქტის რედაქტირება"}
          </button>
        )}
      </div>

      {open && (
        <div style={{ marginTop: "0.75rem" }}>
          <div className="commission-row">
            <div>
              <label className="commission-label">
                {en ? "Phone *" : "ტელეფონი *"}
              </label>
              <input
                className="commission-input"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div>
              <label className="commission-label">
                {en ? "City *" : "ქალაქი *"}
              </label>
              <input
                className="commission-input"
                value={form.city}
                disabled={cityLocked}
                onChange={(e) => set("city", e.target.value)}
              />
              {cityLocked && (
                <p style={{ fontSize: "0.75rem", color: "#856404", marginTop: "0.3rem" }}>
                  {en
                    ? "The city is locked after choosing an offer — delivery was priced for it. Contact support to change it."
                    : "შეთავაზების არჩევის შემდეგ ქალაქი დაბლოკილია — მიწოდების ფასი მასზეა გათვლილი. შესაცვლელად დაგვიკავშირდი."}
                </p>
              )}
            </div>
          </div>
          <div className="commission-row">
            <div>
              <label className="commission-label">
                {en ? "Address *" : "მისამართი *"}
              </label>
              <input
                className="commission-input"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div>
              <label className="commission-label">
                {en ? "Postal code" : "საფოსტო კოდი"}
              </label>
              <input
                className="commission-input"
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
              />
            </div>
          </div>
          <button
            className="commission-submit"
            style={{ marginTop: "1rem" }}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? (en ? "Saving…" : "ინახება…") : en ? "Save" : "შენახვა"}
          </button>
        </div>
      )}
    </div>
  );
}
