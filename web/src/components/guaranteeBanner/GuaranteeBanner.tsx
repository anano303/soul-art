"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { Button } from "@/components/ui/button";
import "./guarantee-banner.css";

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
          <ShieldCheck size={15} strokeWidth={2} aria-hidden="true" />
          {en ? "Buyer protection" : "დაცული შენაძენი"}
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
          <Button href="/paintings" variant="primary" size="md">
            {en ? "Paintings" : "ნახატები"}
          </Button>
          <Button
            href="/handmade"
            variant="secondary"
            size="md"
            className="on-dark"
          >
            {en ? "Handmade items" : "ხელნაკეთი ნივთები"}
          </Button>
        </div>
      </div>
    </section>
  );
}
