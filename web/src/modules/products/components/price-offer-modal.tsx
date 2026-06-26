"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import "./price-offer-modal.css";

interface PriceOfferModalProps {
  productId: string;
  productName: string;
  currentPrice: number;
  onClose: () => void;
}

export default function PriceOfferModal({
  productId,
  productName,
  currentPrice,
  onClose,
}: PriceOfferModalProps) {
  const { language } = useLanguage();
  const en = language === "en";
  const { toast } = useToast();
  const { user: currentUser, login } = useAuth();

  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loggedIn = !!currentUser;

  // Maps backend / validation messages to a clear, localized line shown on the form.
  const mapError = (raw?: string): string => {
    if (!raw)
      return en ? "Could not send the offer" : "შეთავაზება ვერ გაიგზავნა";
    if (raw === "EMAIL_EXISTS")
      return en
        ? "This email is already registered — please log in first."
        : "ეს იმეილი უკვე რეგისტრირებულია — ჯერ გაიარე ავტორიზაცია.";
    if (raw.includes("already have a pending offer"))
      return en
        ? "You already have a pending offer for this product — wait for the seller's reply."
        : "ამ პროდუქტზე უკვე გაქვს გაგზავნილი მოთხოვნა — დაელოდე გამყიდველის პასუხს.";
    if (raw.includes("lower than the current price") || raw.includes("greater than 0"))
      return en
        ? "Your price must be greater than 0 and lower than the current price."
        : "ფასი უნდა იყოს 0-ზე მეტი და მიმდინარე ფასზე ნაკლები.";
    if (raw.includes("your own product"))
      return en
        ? "You can't make an offer on your own product."
        : "საკუთარ პროდუქტზე ფასს ვერ შესთავაზებ.";
    if (raw.includes("Registration details"))
      return en
        ? "Please fill in your name, email and password."
        : "შეავსე სახელი, იმეილი და პაროლი.";
    return raw; // fallback: show the backend's own message
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const offered = Number(price);
    if (!offered || offered <= 0) {
      setError(en ? "Enter a valid price" : "შეიყვანე სწორი ფასი");
      return;
    }
    if (offered >= currentPrice) {
      setError(
        en
          ? `Your price must be lower than the current price (₾${currentPrice})`
          : `შენი ფასი მიმდინარე ფასზე (₾${currentPrice}) ნაკლები უნდა იყოს`,
      );
      return;
    }
    if (!phone.trim()) {
      setError(
        en ? "Please add a contact phone number" : "მიუთითე საკონტაქტო ნომერი",
      );
      return;
    }
    if (!loggedIn && (!name || !email || !password)) {
      setError(
        en
          ? "Fill in name, email and password to continue"
          : "შეავსე სახელი, იმეილი და პაროლი გასაგრძელებლად",
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        productId,
        offeredPrice: offered,
        phone: phone.trim(),
        message: message.trim() || undefined,
      };
      if (!loggedIn) {
        payload.name = name.trim();
        payload.email = email.trim();
        payload.password = password;
      }

      const res = await fetchWithAuth("/price-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const raw = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message;
        setError(mapError(raw));
        return;
      }

      // If we just registered the user inline, establish their session so the
      // accepted price will apply to them later.
      if (!loggedIn && email && password) {
        try {
          login({ email: email.trim(), password });
        } catch {
          /* non-blocking */
        }
      }

      toast({
        title: en ? "Offer sent!" : "შეთავაზება გაიგზავნა!",
        description: en
          ? "The seller will review your price and respond. You'll get a notification and an email."
          : "გამყიდველი განიხილავს შენს ფასს და გიპასუხებს. მიიღებ შეტყობინებას და იმეილს.",
      });
      onClose();
    } catch {
      setError(en ? "Something went wrong" : "დაფიქსირდა შეცდომა");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="po-overlay" onClick={onClose}>
      <div className="po-modal" onClick={(e) => e.stopPropagation()}>
        <button className="po-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="po-header">
          <span className="po-eyebrow">
            🤝 {en ? "Negotiate" : "შეთანხმდი ფასზე"}
          </span>
          <h3 className="po-title">
            {en ? "Offer your price" : "შემოგვთავაზე შენი ფასი"}
          </h3>
          <p className="po-product">{productName}</p>
          <p className="po-current">
            {en ? "Current price:" : "მიმდინარე ფასი:"}{" "}
            <strong>₾{currentPrice}</strong>
          </p>
        </div>

        <form className="po-form" onSubmit={handleSubmit}>
          <label className="po-field">
            <span>{en ? "Your price (₾)" : "შენი ფასი (₾)"}</span>
            <input
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                if (error) setError(null);
              }}
              placeholder={en ? "e.g. 120" : "მაგ. 120"}
              required
            />
          </label>

          <label className="po-field">
            <span>{en ? "Contact phone" : "საკონტაქტო ნომერი"}</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={en ? "+995 5xx xx xx xx" : "+995 5xx xx xx xx"}
              required
            />
            {/* <small className="po-hint">
              {en
                ? "🔒 Only SoulArt admins see your contact details — not the seller."
                : "🔒 შენს საკონტაქტო მონაცემებს მხოლოდ SoulArt-ის ადმინი ხედავს — გამყიდველი ვერა."}
            </small> */}
          </label>

          <label className="po-field">
            <span>
              {en ? "Message (optional)" : "შეტყობინება (სურვილისამებრ)"}
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder={
                en
                  ? "Add a note for the seller…"
                  : "დაუტოვე შეტყობინება გამყიდველს…"
              }
            />
          </label>

          {!loggedIn && (
            <div className="po-register">
              <p className="po-register-note">
                {en
                  ? "Enter your details — we'll create your account automatically so you can receive the seller's answer."
                  : "შეავსე მონაცემები — ანგარიშს ავტომატურად შეგიქმნით, რომ გამყიდველის პასუხი მიიღო."}
              </p>
              <label className="po-field">
                <span>{en ? "Name" : "სახელი"}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="po-field">
                <span>{en ? "Email" : "იმეილი"}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="po-field">
                <span>{en ? "Password" : "პაროლი"}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={5}
                  required
                />
              </label>
            </div>
          )}

          {error && <div className="po-error">{error}</div>}

          <button type="submit" className="po-submit" disabled={submitting}>
            {submitting
              ? en
                ? "Sending…"
                : "იგზავნება…"
              : en
                ? "Send offer"
                : "შეთავაზების გაგზავნა"}
          </button>
        </form>
      </div>
    </div>
  );
}
