"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/hooks/LanguageContext";
import "./guarantee-banner.css";

const PAINTINGS_CATEGORY_ID = "68768f6f0b55154655a8e882";
const HANDMADE_CATEGORY_ID = "68768f850b55154655a8e88f";

export default function GuaranteeBanner() {
  const { language } = useLanguage();
  const en = language === "en";

  return (
    <section
      className="guarantee-banner"
      aria-label={en ? "Buyer protection" : "დაცული შენაძენი"}
    >
      <Image
        src="/handmade.webp"
        alt=""
        fill
        sizes="100vw"
        className="gb-bg"
        aria-hidden="true"
      />
      <div className="gb-overlay" />

      <div className="gb-content Container">
        <span className="gb-badge">
          🛡 {en ? "Buyer protection" : "დაცული შენაძენი"}
        </span>

        <h2 className="gb-title">
          {en
            ? "Handmade items & paintings in one space"
            : "ხელნაკეთი ნივთები და ნახატები ერთ სივრცეში"}
        </h2>

        <p className="gb-text">
          {en ? (
            <>
              If your order isn&apos;t delivered within the stated timeframe,{" "}
              <span className="gb-brand">soulart.ge</span> refunds your money.
            </>
          ) : (
            <>
              ჩვენ ვუზრუნველყოფთ უსაფრთხო მიწოდებასა და თანხის დაბრუნების
              გარანტიას ვადების დარღვევის შემთხვევაში!{" "}
              <span className="gb-brand"> soulart.ge</span> თქვენს გვერდითაა.
            </>
          )}
        </p>

        <div className="gb-actions">
          <Link
            href={`/shop?mainCategory=${PAINTINGS_CATEGORY_ID}`}
            className="gb-btn gb-btn--gold"
          >
            {en ? "Paintings" : "ნახატები"}
          </Link>
          <Link
            href={`/shop?mainCategory=${HANDMADE_CATEGORY_ID}`}
            className="gb-btn gb-btn--ghost"
          >
            {en ? "Handmade items" : "ხელნაკეთი ნივთები"}
          </Link>
        </div>
      </div>
    </section>
  );
}
