"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/LanguageContext";
import { ChevronDown, HelpCircle, Search } from "lucide-react";
import "./faq.css";

interface FaqItem {
  _id: string;
  questionKa: string;
  questionEn?: string;
  answerKa: string;
  answerEn?: string;
  order: number;
}

export default function FaqPage() {
  const { language } = useLanguage();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${API_URL}/faq`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setFaqs(data);
        }
      } catch (err) {
        console.error("Failed to fetch FAQs:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const getQuestion = (faq: FaqItem) =>
    language === "en" && faq.questionEn ? faq.questionEn : faq.questionKa;

  const getAnswer = (faq: FaqItem) =>
    language === "en" && faq.answerEn ? faq.answerEn : faq.answerKa;

  const filteredFaqs = faqs.filter((faq) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      faq.questionKa.toLowerCase().includes(q) ||
      faq.answerKa.toLowerCase().includes(q) ||
      (faq.questionEn && faq.questionEn.toLowerCase().includes(q)) ||
      (faq.answerEn && faq.answerEn.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return (
      <div className="faq-page-loading">
        <div className="faq-page-spinner" />
      </div>
    );
  }

  return (
    <div className="faq-page">
      {/* Hero */}
      <div className="faq-hero">
        <div className="faq-hero-icon">
          <HelpCircle size={40} />
        </div>
        <h1>
          {language === "en"
            ? "Frequently Asked Questions"
            : "ხშირად დასმული კითხვები"}
        </h1>
        <p>
          {language === "en"
            ? "Find answers to common questions about our service"
            : "იპოვეთ პასუხები ხშირად დასმულ კითხვებზე"}
        </p>

        {/* Search */}
        <div className="faq-search">
          <Search size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === "en" ? "Search questions..." : "მოძებნე კითხვა..."
            }
          />
        </div>
      </div>

      {/* FAQ List */}
      <div className="faq-list">
        {filteredFaqs.length === 0 ? (
          <div className="faq-empty">
            <p>
              {language === "en"
                ? "No questions found"
                : "კითხვები ვერ მოიძებნა"}
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq, index) => (
            <div
              key={faq._id}
              className={`faq-item ${openId === faq._id ? "faq-item-open" : ""}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <button
                className="faq-question"
                onClick={() =>
                  setOpenId(openId === faq._id ? null : faq._id)
                }
              >
                <span className="faq-question-number">{index + 1}</span>
                <span className="faq-question-text">{getQuestion(faq)}</span>
                <ChevronDown
                  size={20}
                  className={`faq-chevron ${openId === faq._id ? "faq-chevron-open" : ""}`}
                />
              </button>
              <div
                className={`faq-answer ${openId === faq._id ? "faq-answer-open" : ""}`}
              >
                <div className="faq-answer-inner">
                  <p>{getAnswer(faq)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
