"use client";

import { useState } from "react";
import "./contact.css";
import { useLanguage } from "@/hooks/LanguageContext";
import { trackLead } from "@/components/MetaPixel";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" })); // Clear error on input
  };

  const validateForm = () => {
    const newErrors = {
      name: formData.name ? "" : t("contact.nameRequired"),
      email: formData.email ? "" : t("contact.emailRequired"),
      subject: formData.subject ? "" : t("contact.subjectRequired"),
      message: formData.message ? "" : t("contact.messageRequired"),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const isValid = validateForm();
    if (!isValid) {
      event.preventDefault();
      return;
    }

    trackLead({
      lead_type: "contact_form",
      subject: formData.subject,
      hasMessage: Boolean(formData.message?.trim()),
      replyEmail: formData.email,
    });
  };

  return (
    <div className="contact-container">
      <h1 className="contact-title">{t("contact.title")}</h1>
      <p className="contact-description">{t("contact.description")}</p>
      <form
        action="https://formspree.io/f/movenjpn"
        method="POST"
        className="contact-form"
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label htmlFor="name">{t("contact.name")}</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={t("contact.namePlaceholder")}
            className={`form-input ${errors.name ? "error-border" : ""}`}
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="email">{t("contact.email")}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t("contact.emailPlaceholder")}
            className={`form-input ${errors.email ? "error-border" : ""}`}
          />
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="subject">{t("contact.subject")}</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder={t("contact.subjectPlaceholder")}
            className={`form-input ${errors.subject ? "error-border" : ""}`}
          />
          {errors.subject && <p className="form-error">{errors.subject}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="message">{t("contact.message")}</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder={t("contact.messagePlaceholder")}
            className={`form-textarea ${errors.message ? "error-border" : ""}`}
          ></textarea>
          {errors.message && <p className="form-error">{errors.message}</p>}
        </div>
        <button type="submit" className="form-button">
          {t("contact.send")}
        </button>
      </form>
    </div>
  );
}
