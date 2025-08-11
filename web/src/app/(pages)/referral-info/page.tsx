"use client";

import { useState } from "react";
import Link from "next/link";
import "./referral-info.css";

export default function ReferralInfoPage() {
  const [copySuccess, setCopySuccess] = useState(false);

  const shareReferralInfo = async () => {
    const shareText = `🎨 SoulArt.ge-ზე შეგიძლია გამოიშოვო ფული!

🎯 რეფერალების სისტემა:
• მოიწვიე სელერები - მიიღე 5 ლარი
• მოიწვიე ჩვეულებრივი მომხმარებლები - მიიღე 20 თეთრი
• მინიმუმ 5 პროდუქტი სჭირდება სელერს ბონუსისთვის
• მინიმუმ 50 ლარი შეგიძლია გამოიღო

დარეგისტრირდი ახლავე: ${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "SoulArt.ge - გამოიმუშავე ფული რეფერალებით",
          text: shareText,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback - copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.log("Failed to copy text:", err);
      }
    }
  };

  return (
    <div className="referral-info-container">
      <div className="referral-info-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">🎨 გამოიმუშავე ფული SoulArt.ge-ზე!</h1>
            <p className="hero-subtitle">
              მოიწვიე მეგობრები და მიიღე ფულადი ბონუსები ყველა წარმატებული
              რეფერალისთვის
            </p>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-amount">5 ₾</div>
                <div className="stat-label">სელერი რეფერალისთვის</div>
              </div>
              <div className="stat-item">
                <div className="stat-amount">0.20 ₾</div>
                <div className="stat-label">ჩვეულებრივი მომხმარებლისთვის</div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="how-it-works">
          <h2 className="section-title">როგორ მუშაობს?</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">დარეგისტრირდი</h3>
              <p className="step-description">
                შექმენი ანგარიში SoulArt.ge-ზე და მიიღე შენი უნიკალური
                რეფერალური ლინკი
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">მოიწვიე მეგობრები</h3>
              <p className="step-description">
                გაუზიარე შენი რეფერალური ლინკი მეგობრებს, ოჯახის წევრებს და
                ნაცნობებს
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">მიიღე ბონუსები</h3>
              <p className="step-description">
                ყველა წარმატებული რეგისტრაციისთვის მიიღებ ფულად ბონუსს შენს
                ანგარიშზე
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h3 className="step-title">გაიტანე თანხა</h3>
              <p className="step-description">
                50 ლარის მოგროვების შემდეგ შეგიძლია ფულის გატანა ბანკის
                ანგარიშზე
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="benefits-section">
          <h2 className="section-title">რატომ SoulArt.ge?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">🎨</div>
              <h3 className="benefit-title">ქართული ხელოვნება</h3>
              <p className="benefit-description">
                ქართველი მხატვრების და ხელოვანების უნიკალური ნამუშევრების პლატფორმა
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h3 className="benefit-title">გამომუშავების შესაძლებლობა</h3>
              <p className="benefit-description">
                რეფერალების სისტემით შეგიძლია ფულის გამომუშავება
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">👥</div>
              <h3 className="benefit-title">საზოგადოება</h3>
              <p className="benefit-description">
                ხელოვნების მოყვარულთა აქტიური კომუნიკაცია
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🚀</div>
              <h3 className="benefit-title">იოლი გამოყენება</h3>
              <p className="benefit-description">
                მარტივი და მოსახერხებელი ინტერფეისი
              </p>
            </div>
          </div>
        </section>

        {/* Earnings potential */}
        <section className="earnings-section">
          <h2 className="section-title">გამომუშავების პოტენციალი</h2>
          <div className="earnings-calculator">
            <div className="calculator-card">
              <h3>თუ მოიწვევ:</h3>
              <div className="calculation-row">
                <span>10 სელერს</span>
                <span className="arrow">→</span>
                <span className="earning">50 ₾</span>
              </div>
              <div className="calculation-row">
                <span>20 სელერს</span>
                <span className="arrow">→</span>
                <span className="earning">100 ₾</span>
              </div>
              <div className="calculation-row">
                <span>50 სელერს</span>
                <span className="arrow">→</span>
                <span className="earning">250 ₾</span>
              </div>
              <p className="calculator-note">
                * სელერმა უნდა ატვირთოს მინიმუმ 5 პროდუქტი ბონუსის მისაღებად
              </p>
            </div>
          </div>
        </section>

        {/* Rules */}
        <section className="rules-section">
          <h2 className="section-title">წესები და პირობები</h2>
          <div className="rules-grid">
            <div className="rule-card">
              <h4>სელერი რეფერალი</h4>
              <ul>
                <li>5 ლარი ყველა დამტკიცებული სელერისთვის</li>
                <li>სელერმა უნდა ატვირთოს მინიმუმ 5 პროდუქტი</li>
                <li>ადმინისტრაციის დადასტურება სავალდებულოა</li>
              </ul>
            </div>
            <div className="rule-card">
              <h4>ჩვეულებრივი რეფერალი</h4>
              <ul>
                <li>20 თეთრი ყველა რეგისტრირებული მომხმარებლისთვის</li>
                <li>დამატებითი პირობები არ არის</li>
              </ul>
            </div>
            <div className="rule-card">
              <h4>ფულის გატანა</h4>
              <ul>
                <li>მინიმუმ 50 ლარი</li>
                <li>მაქსიმუმ 2-ჯერ თვეში</li>
                <li>ბანკის ანგარიშზე გადარიცხვა</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">მზად ხარ დასაწყებად?</h2>
            <p className="cta-description">
              დარეგისტრირდი ახლავე და დაიწყე ფულის გამომუშავება!
            </p>
            <div className="cta-buttons">
              <Link href="/register?role=seller" className="btn btn-primary">
                რეგისტრაცია სელერად
              </Link>
              <Link href="/register" className="btn btn-secondary">
                ჩვეულებრივი რეგისტრაცია
              </Link>
            </div>
            <div className="share-section">
              <p>ან გაუზიარე ეს ინფორმაცია მეგობრებს:</p>
              <button onClick={shareReferralInfo} className="btn btn-share">
                {copySuccess ? "დაკოპირდა! ✅" : "გაზიარება/კოპირება 📋"}
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq-section">
          <h2 className="section-title">ხშირად დასმული კითხვები</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>რამდენ ხანში მივიღებ ბონუსს?</h4>
              <p>
                სელერი რეფერალისთვის ბონუსი ირიცხება მას შემდეგ, რაც ის
                ატვირთავს 5 პროდუქტს და ადმინისტრაცია დაამტკიცებს მას.
              </p>
            </div>
            <div className="faq-item">
              <h4>შემიძლია თუ არა საკუთარი რეფერალური ლინკით რეგისტრაცია?</h4>
              <p>
                არა, საკუთარი რეფერალური ლინკით რეგისტრაცია არ არის შესაძლებელი.
              </p>
            </div>
            <div className="faq-item">
              <h4>რა მეთოდებით შემიძლია ფულის გატანა?</h4>
              <p>ფულის გატანა შესაძლებელია ბანკის ანგარიშზე გადარიცხვით.</p>
            </div>
            <div className="faq-item">
              <h4>არის თუ არა ლიმიტი რეფერალების რაოდენობაზე?</h4>
              <p>არა, შეგიძლია მოიწვიო  რამდენიც მეგობარი გსურს.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
