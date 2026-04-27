"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import "./heroCategories.css";

const S3 = "https://soulart-s3.s3.eu-north-1.amazonaws.com";

const CATEGORIES = [
  {
    id: "68768f6f0b55154655a8e882",
    name: "ნახატები",
    nameEn: "Paintings",
    descKa: "ორიგინალი ტილოები ქართველი მხატვრებისგან",
    descEn: "Original canvases from Georgian artists",
    image: `${S3}/ecommerce/dnjabkoc8ysvkpjicyww.jpg`,
  },
  {
    id: "68768f850b55154655a8e88f",
    name: "ხელნაკეთი ნივთები",
    nameEn: "Handmade",
    descKa: "უნიკალური ხელნაკეთი ნივთები და აქსესუარები",
    descEn: "Unique handmade items and accessories",
    image: `${S3}/ecommerce/cjttuuzvasd3eaadv6vz.jpg`,
  },
];

const HeroCategories = () => {
  const { language } = useLanguage();

  return (
    <section className="hero-categories-section">
      <div className="hero-categories">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            href={`/shop?page=1&mainCategory=${cat.id}`}
            className="hero-category-card"
          >
            <div className="hero-category-img-wrap">
              <Image
                src={cat.image}
                alt={language === "en" ? cat.nameEn : cat.name}
                fill
                sizes="(max-width: 768px) 100vw, 440px"
                className="hero-category-img"
              />
            </div>
            <div className="hero-category-info">
              <h3 className="hero-category-name">
                {language === "en" ? cat.nameEn : cat.name}
              </h3>
              <p className="hero-category-desc">
                {language === "en" ? cat.descEn : cat.descKa}
              </p>
              <span className="hero-category-cta">
                {language === "en" ? "Explore" : "ნახვა"}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default HeroCategories;
