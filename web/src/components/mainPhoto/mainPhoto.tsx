"use client";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import "./mainPhoto.css";
import { useLanguage } from "@/hooks/LanguageContext";
import SearchBox from "../SearchBox/search-box";
import BrushTrail from "../BrushTrail/BrushTrail";

const CATEGORIES = [
  {
    id: "68768f6f0b55154655a8e882",
    name: "ნახატები",
    nameEn: "Paintings",
    icon: "/loading.png",
  },
  {
    id: "68768f850b55154655a8e88f",
    name: "ხელნაკეთი",
    nameEn: "Handmade",
    icon: "/handmade.png",
  },
];

const MainPhoto = () => {
  const { t, language } = useLanguage();
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="home-container">
      <BrushTrail containerRef={heroRef} />
      <div className="main-hero-section" ref={heroRef}>
        <Image
          src="/van-gogh.webp"
          alt="SoulArt Hero"
          fill
          priority
          quality={75}
          sizes="100vw"
          style={{
            objectFit: "cover",
            objectPosition: "center",
            zIndex: 0,
          }}
        />
        <div className="hero-bg-overlay" />
        <div className="hero-text">
          <h1>{t("home.heroTitle")}</h1>
          <p>{t("home.heroSubtitle")}</p>
        </div>
        <div className="hero-category-buttons">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?page=1&mainCategory=${cat.id}`}
              className="hero-cat-btn"
            >
              <Image
                src={cat.icon}
                alt=""
                width={22}
                height={22}
                className="hero-cat-icon"
              />
              {language === "en" ? cat.nameEn : cat.name}
            </Link>
          ))}
        </div>
        <div className="search-box">
          <SearchBox />
        </div>
      </div>
    </div>
  );
};

export default MainPhoto;
