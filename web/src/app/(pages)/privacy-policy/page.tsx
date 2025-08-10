"use client";

import { useState } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import "./privacy-policy.css";

export default function PrivacyPolicyPage() {
  const { language } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-content">
        <h1 className="privacy-policy-title">
          {language === "en" ? "Privacy Policy" : "კონფიდენციალურობის პოლიტიკა"}
        </h1>

        <div className="privacy-intro">
          <p>
            {language === "en"
              ? "At SoulArt, we are committed to protecting your privacy and personal information. This page provides you with access to our comprehensive privacy policy."
              : "SoulArt-ში ჩვენ ვალდებული ვართ დავიცვათ თქვენი კონფიდენციალურობა და პირადი ინფორმაცია. ეს გვერდი თქვენ გაძლევთ წვდომას ჩვენს ყოვლისმომცველ კონფიდენციალურობის პოლიტიკაზე."}
          </p>
        </div>

        <div className="policy-actions">
          <button
            onClick={() => setIsModalOpen(true)}
            className="view-policy-btn"
          >
            {language === "en"
              ? "📋 View Privacy Policy"
              : "📋 კონფიდენციალურობის პოლიტიკის ნახვა"}
          </button>
        </div>

        <div className="policy-summary">
          <h2>{language === "en" ? "Quick Overview" : "მოკლე მიმოხილვა"}</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <h3>
                {language === "en"
                  ? "🔒 Data Protection"
                  : "🔒 მონაცემთა დაცვა"}
              </h3>
              <p>
                {language === "en"
                  ? "We use industry-standard security measures to protect your personal information."
                  : "ჩვენ ვიყენებთ ინდუსტრიის სტანდარტული უსაფრთხოების ზომებს თქვენი პირადი ინფორმაციის დასაცავად."}
              </p>
            </div>
            <div className="summary-item">
              <h3>
                {language === "en"
                  ? "📊 Data Usage"
                  : "📊 მონაცემთა გამოყენება"}
              </h3>
              <p>
                {language === "en"
                  ? "Your information is used only to provide our marketplace services and improve your experience."
                  : "თქვენი ინფორმაცია გამოიყენება მხოლოდ ჩვენი მარკეტპლეისის სერვისების უზრუნველსაყოფად და თქვენი გამოცდილების გასაუმჯობესებლად."}
              </p>
            </div>
            <div className="summary-item">
              <h3>
                {language === "en"
                  ? "🤝 No Data Selling"
                  : "🤝 მონაცემების არ გაყიდვა"}
              </h3>
              <p>
                {language === "en"
                  ? "We never sell, rent, or trade your personal information to third parties."
                  : "ჩვენ არასოდეს ვყიდით, ვაქირავებთ ან ვცვლით თქვენს პირად ინფორმაციას მესამე მხარეებთან."}
              </p>
            </div>
            <div className="summary-item">
              <h3>
                {language === "en" ? "✅ Your Rights" : "✅ თქვენი უფლებები"}
              </h3>
              <p>
                {language === "en"
                  ? "You have full control over your data - access, update, or delete it anytime."
                  : "გაქვთ სრული კონტროლი თქვენს მონაცემებზე - იხილეთ, განაახლეთ ან წაშალეთ ნებისმიერ დროს."}
              </p>
            </div>
          </div>
        </div>

        <div className="contact-section">
          <h2>{language === "en" ? "Have Questions?" : "გაქვთ კითხვები?"}</h2>
          <p>
            {language === "en"
              ? "If you have any questions about our privacy practices, please don't hesitate to contact us."
              : "თუ გაქვთ რაიმე კითხვა ჩვენი კონფიდენციალურობის პრაქტიკის შესახებ, გთხოვთ დაგვიკავშირდეთ."}
          </p>
          <div className="contact-info">
            <p>📧 info@soulart.ge</p>
            <p>📞 +995 551 00 00 59</p>
            <p>
              📍{" "}
              {language === "en" ? "Tbilisi, Georgia" : "თბილისი, საქართველო"}
            </p>
          </div>
        </div>
      </div>

      <PrivacyPolicy
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
