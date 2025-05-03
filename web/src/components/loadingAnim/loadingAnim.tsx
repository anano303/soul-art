"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useLanguage } from "@/hooks/LanguageContext";
import Spiner from "../../assets/spiner.png";
import "./loadingAnim.css";

const LoadingAnim = () => {
  const [dots, setDots] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-container">
      <Image
        src={Spiner}
        alt="Loading"
        width={24}
        height={24}
        className="loading-image"
      />
      <p className="loading-text">
        {t("shop.loading")}
        {dots}
      </p>
    </div>
  );
};

export default LoadingAnim;
