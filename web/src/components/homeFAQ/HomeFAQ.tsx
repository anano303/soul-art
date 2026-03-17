"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import { ChevronDown, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import "./HomeFAQ.css";

interface FaqItem {
  _id: string;
  questionKa: string;
  questionEn?: string;
  answerKa: string;
  answerEn?: string;
}

const HomeFAQ = () => {
  const { language } = useLanguage();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${API_URL}/faq`, {
          next: { revalidate: 300 }, // 5 წუთში ერთხელ
        });
        if (res.ok) {
          const data = await res.json();
          // მთავარ გვერდზე მაქს. 5 კითხვა
          setFaqs(data.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to fetch FAQs:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  if (isLoading || faqs.length === 0) return null;

  const getQuestion = (faq: FaqItem) =>
    language === "en" && faq.questionEn ? faq.questionEn : faq.questionKa;

  const getAnswer = (faq: FaqItem) =>
    language === "en" && faq.answerEn ? faq.answerEn : faq.answerKa;

  return (
    <section className="home-faq">
      <div className="home-faq-container">
        {/* Header */}
        <div className="home-faq-header">
          <div className="home-faq-icon">
            <HelpCircle size={24} />
          </div>
          <h2>
            {language === "en"
              ? "Frequently Asked Questions"
              : "ხშირად დასმული კითხვები"}
          </h2>
          <p>
            {language === "en"
              ? "Quick answers to common questions"
              : "სწრაფი პასუხები ხშირ კითხვებზე"}
          </p>
        </div>

        {/* FAQ Items */}
        <div className="home-faq-list">
          {faqs.map((faq) => (
            <div
              key={faq._id}
              className={`home-faq-item ${openId === faq._id ? "home-faq-item-open" : ""}`}
            >
              <button
                className="home-faq-question"
                onClick={() =>
                  setOpenId(openId === faq._id ? null : faq._id)
                }
              >
                <span>{getQuestion(faq)}</span>
                <ChevronDown
                  size={18}
                  className={`home-faq-chevron ${openId === faq._id ? "home-faq-chevron-open" : ""}`}
                />
              </button>
              <div
                className={`home-faq-answer ${openId === faq._id ? "home-faq-answer-open" : ""}`}
              >
                <p>{getAnswer(faq)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="home-faq-footer">
          <Link href="/faq" className="home-faq-link">
            {language === "en" ? "View all questions" : "ყველა კითხვის ნახვა"}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeFAQ;
