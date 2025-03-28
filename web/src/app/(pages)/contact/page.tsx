"use client";

import { useState } from "react";
import "./contact.css";

export default function ContactPage() {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" })); // Clear error on input
  };

  const validateForm = () => {
    const newErrors = {
      name: formData.name ? "" : "Name is required.",
      email: formData.email ? "" : "Email is required.",
      subject: formData.subject ? "" : "Subject is required.",
      message: formData.message ? "" : "Message is required.",
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  return (
    <div className="contact-container">
      <h1 className="contact-title">კონტაქტი</h1>
      <p className="contact-description">
        თუ გაქვთ შეკითხვები ან გსურთ ჩვენთან დაკავშირება, გთხოვთ შეავსოთ ქვემოთ მოცემული ფორმა.
      </p>
      <form
        action="https://formspree.io/f/movenjpn"
        method="POST"
        className="contact-form"
        onSubmit={(e) => {
          if (!validateForm()) {
            e.preventDefault();
          }
        }}
      >
        <div className="form-group">
          <label htmlFor="name">სახელი</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`form-input ${errors.name ? "error-border" : ""}`}
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="email">ელ. ფოსტა</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`form-input ${errors.email ? "error-border" : ""}`}
          />
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="subject">თემა</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className={`form-input ${errors.subject ? "error-border" : ""}`}
          />
          {errors.subject && <p className="form-error">{errors.subject}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="message">მესიჯი</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            className={`form-textarea ${errors.message ? "error-border" : ""}`}
          ></textarea>
          {errors.message && <p className="form-error">{errors.message}</p>}
        </div>
        <button type="submit" className="form-button">
          გაგზავნა
        </button>
      </form>
    </div>
  );
}
