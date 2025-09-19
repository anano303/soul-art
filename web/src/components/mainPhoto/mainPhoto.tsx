"use client";
import "./mainPhoto.css";
import { useLanguage } from "@/hooks/LanguageContext";
import SearchBox from "../SearchBox/search-box";

const MainPhoto = () => {
  const { t } = useLanguage();

  return (
    <div className="home-container">
      <div className="main-hero-section">
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
