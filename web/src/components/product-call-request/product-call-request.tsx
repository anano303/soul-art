"use client";

import { useState, useCallback } from "react";
import { X, Phone, Loader2, CheckCircle, MessageCircle } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import "./product-call-request.css";

interface ProductCallRequestProps {
  productName: string;
  productId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductCallRequest({
  productName,
  productId,
  isOpen,
  onClose,
}: ProductCallRequestProps) {
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    question: "",
  });
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    onClose();
    // Reset form after close animation
    setTimeout(() => {
      setIsSuccess(false);
      setFormData({ name: "", phone: "", email: "", question: "" });
      setError("");
    }, 300);
  }, [onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!formData.name.trim()) {
        setError(
          language === "en"
            ? "Please enter your name"
            : "გთხოვთ შეიყვანეთ სახელი"
        );
        return;
      }

      if (!formData.phone.trim()) {
        setError(
          language === "en"
            ? "Please enter your phone number"
            : "გთხოვთ შეიყვანეთ ტელეფონის ნომერი"
        );
        return;
      }

      setIsSubmitting(true);

      try {
        const res = await fetch("/api/call-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim() || undefined,
            question: formData.question.trim() || undefined,
            productName,
            productId,
          }),
        });

        if (!res.ok) {
          throw new Error("Request failed");
        }

        setIsSuccess(true);

        // 3 წამის შემდეგ დახურე
        setTimeout(() => {
          handleClose();
        }, 3000);
      } catch {
        setError(
          language === "en"
            ? "Something went wrong. Please try again."
            : "დაფიქსირდა შეცდომა. გთხოვთ სცადოთ ხელახლა."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, language, productName, productId, handleClose]
  );

  if (!isOpen) return null;

  return (
    <div className="pcr-overlay" onClick={handleClose}>
      <div className="pcr-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pcr-close" onClick={handleClose}>
          <X size={20} />
        </button>

        {isSuccess ? (
          <div className="pcr-success">
            <CheckCircle size={48} className="pcr-success-icon" />
            <h3>
              {language === "en" ? "Request Sent!" : "მოთხოვნა გაიგზავნა!"}
            </h3>
            <p>
              {language === "en"
                ? "We will contact you shortly"
                : "მალე დაგიკავშირდებით"}
            </p>
          </div>
        ) : (
          <>
            <div className="pcr-header">
              <div className="pcr-icon">
                <MessageCircle size={28} />
              </div>
              <h3 className="pcr-title">
                {language === "en"
                  ? "Request a Call / More Info"
                  : "მოითხოვე ზარი / მეტი ინფორმაცია"}
              </h3>
              <p className="pcr-product-name">{productName}</p>
            </div>

            <form className="pcr-form" onSubmit={handleSubmit}>
              <div className="pcr-field">
                <label>
                  {language === "en" ? "Name *" : "სახელი, გვარი *"}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={
                    language === "en" ? "Your name" : "თქვენი სახელი, გვარი"
                  }
                  autoComplete="name"
                />
              </div>

              <div className="pcr-field">
                <label>
                  {language === "en"
                    ? "Phone number *"
                    : "ტელეფონის ნომერი *"}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+995 5XX XXX XXX"
                  autoComplete="tel"
                />
              </div>

              <div className="pcr-field">
                <label>
                  {language === "en"
                    ? "Email (optional)"
                    : "ელ. ფოსტა (არასავალდებულო)"}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="example@mail.com"
                  autoComplete="email"
                />
              </div>

              <div className="pcr-field">
                <label>
                  {language === "en"
                    ? "What interests you?"
                    : "რა გაინტერესებთ?"}
                </label>
                <textarea
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  placeholder={
                    language === "en"
                      ? "Write your question or what information you need..."
                      : "დაწერეთ თქვენი შეკითხვა ან რა ინფორმაცია გჭირდებათ..."
                  }
                  rows={3}
                />
              </div>

              {error && <p className="pcr-error">{error}</p>}

              <button
                type="submit"
                className="pcr-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="pcr-spin" />
                    {language === "en" ? "Sending..." : "იგზავნება..."}
                  </>
                ) : (
                  <>
                    <Phone size={18} />
                    {language === "en"
                      ? "Send Request"
                      : "მოთხოვნის გაგზავნა"}
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
