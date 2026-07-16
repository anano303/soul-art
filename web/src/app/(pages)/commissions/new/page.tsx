"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { toast } from "@/hooks/use-toast";
import {
  createCommission,
  COMMISSION_TYPE_LABELS,
  CommissionType,
} from "@/modules/commissions/api/commissions-api";
import { AddressSelector } from "@/modules/checkout/components/address-selector";
import { CheckoutProvider } from "@/modules/checkout/context/checkout-context";
import "../commissions.css";

interface SelectedAddress {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
}

const TYPES = Object.keys(COMMISSION_TYPE_LABELS) as CommissionType[];

function NewCommissionForm() {
  const { language } = useLanguage();
  const router = useRouter();
  const { user, isLoading } = useUser();
  const searchParams = useSearchParams();

  const [type, setType] = useState<CommissionType>("portrait");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState("");
  const [material, setMaterial] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedAddr, setSelectedAddr] = useState<SelectedAddress | null>(null);
  const [desiredDueDate, setDesiredDueDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [targetArtistId, setTargetArtistId] = useState<string | null>(null);
  const [targetArtistName, setTargetArtistName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill type from the SEO landing pages (?type=pet etc.)
  // and the target artist when placed from an artist's profile (?artist=..).
  useEffect(() => {
    const t = searchParams?.get("type");
    if (t && TYPES.includes(t as CommissionType)) {
      setType(t as CommissionType);
    }
    const artist = searchParams?.get("artist");
    if (artist) setTargetArtistId(artist);
    const artistName = searchParams?.get("artistName");
    if (artistName) setTargetArtistName(artistName);
  }, [searchParams]);

  // Redirect to login if not authenticated.
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect=/commissions/new");
    }
  }, [isLoading, user, router]);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).slice(0, 8);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!description.trim() || !size.trim()) {
      toast({
        title: language === "en" ? "Missing fields" : "შეავსე ველები",
        description:
          language === "en"
            ? "Please fill all required fields."
            : "გთხოვ შეავსო ყველა სავალდებულო ველი.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedAddr || !selectedAddr.address || !selectedAddr.city || !selectedAddr.phoneNumber) {
      toast({
        title: language === "en" ? "Select an address" : "აირჩიე მისამართი",
        description:
          language === "en"
            ? "Please select or add a delivery address."
            : "აირჩიე ან დაამატე მიწოდების მისამართი.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("type", type);
      form.append("description", description.trim());
      form.append("size", size.trim());
      if (material.trim()) form.append("material", material.trim());
      if (budget) form.append("budget", budget);
      form.append("address", selectedAddr.address.trim());
      form.append("city", selectedAddr.city.trim());
      if (selectedAddr.postalCode?.trim())
        form.append("postalCode", selectedAddr.postalCode.trim());
      form.append("country", selectedAddr.country || "Georgia");
      form.append("phone", selectedAddr.phoneNumber.trim());
      if (desiredDueDate) form.append("desiredDueDate", desiredDueDate);
      if (targetArtistId) form.append("targetArtistId", targetArtistId);
      files.forEach((f) => form.append("images", f));

      await createCommission(form);
      toast({
        title: language === "en" ? "Request sent!" : "შეკვეთა გაიგზავნა!",
        description:
          language === "en"
            ? "Artists will send offers within 24 hours."
            : "მხატვრები 24 საათის განმავლობაში გამოგიგზავნიან შეთავაზებებს.",
      });
      router.push("/commissions");
    } catch (err) {
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="commission-page commission-page--order-bg">
      <div className="commission-container">
        <h1 className="commission-h1">
          {language === "en"
            ? "Order a custom artwork"
            : "შეუკვეთე ინდივიდუალური ნამუშევარი"}
        </h1>
        <p className="commission-sub">
          {language === "en"
            ? "Upload a reference photo, describe what you want, and receive offers from several artists within 24 hours."
            : "ატვირთე ფოტო, აღწერე რა გინდა და 24 საათის განმავლობაში მიიღე შეთავაზებები რამდენიმე მხატვრისგან."}
        </p>

        {targetArtistId && (
          <div className="commission-direct-note">
            🎯{" "}
            {language === "en"
              ? "Direct order to"
              : "პირდაპირი შეკვეთა მხატვრისთვის:"}{" "}
            <strong>{targetArtistName || (language === "en" ? "this artist" : "ამ მხატვრისთვის")}</strong>
          </div>
        )}

        <div className="commission-form">
          {/* Type */}
          <label className="commission-label">
            {language === "en" ? "Type" : "სტილი"}
          </label>
          <div className="commission-type-grid">
            {TYPES.map((tp) => (
              <button
                type="button"
                key={tp}
                className={`commission-type-chip ${
                  type === tp ? "active" : ""
                }`}
                onClick={() => setType(tp)}
              >
                {language === "en"
                  ? COMMISSION_TYPE_LABELS[tp].en
                  : COMMISSION_TYPE_LABELS[tp].ge}
              </button>
            ))}
          </div>

          {/* Photos */}
          <label className="commission-label">
            {language === "en" ? "Reference photo(s)" : "ფოტო(ები)"}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="commission-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            📷 {language === "en" ? "Upload photos" : "ატვირთე ფოტოები"}
          </button>
          {previews.length > 0 && (
            <div className="commission-previews">
              {previews.map((src, i) => (
                <div key={i} className="commission-preview">
                  <Image src={src} alt={`ref-${i}`} fill sizes="80px" />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <label className="commission-label">
            {language === "en" ? "What should be drawn *" : "რა უნდა დაიხატოს *"}
          </label>
          <textarea
            className="commission-input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              language === "en"
                ? "Describe your idea…"
                : "აღწერე შენი იდეა…"
            }
          />

          <div className="commission-row">
            <div>
              <label className="commission-label">
                {language === "en" ? "Size *" : "ზომა *"}
              </label>
              <input
                className="commission-input"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="A4, 50x70…"
              />
            </div>
            <div>
              <label className="commission-label">
                {language === "en" ? "Material" : "მასალა"}
              </label>
              <input
                className="commission-input"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder={
                  language === "en" ? "Oil, acrylic…" : "ზეთი, აკრილი…"
                }
              />
            </div>
          </div>

          <div className="commission-row">
            <div>
              <label className="commission-label">
                {language === "en"
                  ? "Budget (optional)"
                  : "ბიუჯეტი (არასავალდებულო)"}
              </label>
              <input
                className="commission-input"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="₾"
              />
            </div>
            <div>
              <label className="commission-label">
                {language === "en"
                  ? "Desired due date"
                  : "სასურველი დასრულების თარიღი"}
              </label>
              <input
                className="commission-input"
                type="date"
                value={desiredDueDate}
                onChange={(e) => setDesiredDueDate(e.target.value)}
              />
            </div>
          </div>

          <label className="commission-label">
            {language === "en" ? "Delivery address *" : "მიწოდების მისამართი *"}
          </label>
          <div className="commission-address">
            <CheckoutProvider>
              <AddressSelector
                onAddressSelected={(a) =>
                  setSelectedAddr({
                    address: a.address,
                    city: a.city,
                    postalCode: a.postalCode,
                    country: a.country,
                    phoneNumber: a.phoneNumber,
                  })
                }
              />
            </CheckoutProvider>
          </div>

          <button
            type="button"
            className="commission-submit"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? language === "en"
                ? "Sending…"
                : "იგზავნება…"
              : language === "en"
              ? "Submit request"
              : "შეკვეთის განთავსება"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewCommissionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
      <NewCommissionForm />
    </Suspense>
  );
}
