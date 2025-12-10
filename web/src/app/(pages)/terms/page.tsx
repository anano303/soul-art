"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import "../privacy-policy/privacy-policy.css";

export default function TermsPage() {
  const { language } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-content">
        <h1 className="privacy-policy-title">
          {language === "en" ? "Terms and Conditions" : "წესები და პირობები"}
        </h1>

        <div className="privacy-intro">
          <p>
            {language === "en"
              ? "Welcome to SoulArt. These terms and conditions outline the rules and regulations for the use of our website and services."
              : "კეთილი იყოს თქვენი მობრძანება SoulArt-ზე. ეს წესები და პირობები განსაზღვრავს ჩვენი ვებსაიტისა და სერვისების გამოყენების წესებს."}
          </p>
        </div>

        <div className="policy-actions">
          <button
            onClick={() => setIsModalOpen(true)}
            className="view-policy-btn"
          >
            {language === "en"
              ? "📋 View Terms and Conditions"
              : "📋 წესებისა და პირობების ნახვა"}
          </button>
        </div>

        <div className="policy-summary">
          <h2>{language === "en" ? "Quick Overview" : "მოკლე მიმოხილვა"}</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <h3>
                {language === "en"
                  ? "🛒 Shopping"
                  : "🛒 შოპინგი"}
              </h3>
              <p>
                {language === "en"
                  ? "All products on SoulArt are handmade by Georgian artists. Prices are in Georgian Lari (₾)."
                  : "SoulArt-ზე ყველა პროდუქტი ხელნაკეთია ქართველი ხელოვანების მიერ. ფასები მითითებულია ლარებში (₾)."}
              </p>
            </div>
            <div className="summary-item">
              <h3>
                {language === "en"
                  ? "📦 Delivery"
                  : "📦 მიწოდება"}
              </h3>
              <p>
                {language === "en"
                  ? "We deliver throughout Georgia. Delivery times and costs vary depending on location."
                  : "მიწოდება ხდება საქართველოს მასშტაბით. მიწოდების დრო და ღირებულება დამოკიდებულია ადგილმდებარეობაზე."}
              </p>
            </div>
            <div className="summary-item">
              <h3>
                {language === "en"
                  ? "💳 Payments"
                  : "💳 გადახდა"}
              </h3>
              <p>
                {language === "en"
                  ? "We accept secure online payments through Bank of Georgia payment system."
                  : "ვიღებთ უსაფრთხო ონლაინ გადახდებს საქართველოს ბანკის გადახდის სისტემით."}
              </p>
            </div>
            <div className="summary-item">
              <h3>
                {language === "en"
                  ? "🔄 Returns"
                  : "🔄 დაბრუნება"}
              </h3>
              <p>
                {language === "en"
                  ? "Products can be returned within 14 days if unused and in original condition."
                  : "პროდუქტის დაბრუნება შესაძლებელია 14 დღის განმავლობაში, თუ არ არის გამოყენებული."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <TermsAndConditions
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
