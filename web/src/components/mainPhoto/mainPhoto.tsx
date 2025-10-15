"use client";
import { useRef } from "react";
import "./mainPhoto.css";
import { useLanguage } from "@/hooks/LanguageContext";
import SearchBox from "../SearchBox/search-box";
import BrushTrail from "../BrushTrail/BrushTrail";

const MainPhoto = () => {
  const { t } = useLanguage();
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="home-container">
      <BrushTrail containerRef={heroRef} />
      <div className="main-hero-section" ref={heroRef}>
        <div className="hero-text">
          <h2>{t("home.heroTitle")}</h2>
          <p>{t("home.heroSubtitle")}</p>
        </div>
        <div className="search-box">
          <SearchBox />
        </div>
      </div>
    </div>
  );
};

export default MainPhoto;
