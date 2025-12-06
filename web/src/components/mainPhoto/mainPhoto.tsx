"use client";
import { useRef } from "react";
import Image from "next/image";
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
        {/* Hero Background Image - Priority for LCP optimization */}
        <Image
          src="/van-gogh.jpg"
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
        <div className="hero-text">
          <h1>{t("home.heroTitle")}</h1>
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
