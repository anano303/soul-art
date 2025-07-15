"use client";

import { useEffect, useState } from "react";
import "./heartLoading.css";
import Image from "next/image";

type HeartLoadingProps = {
  size?: "small" | "medium" | "large";
  inline?: boolean;
};

export default function HeartLoading({
  size = "small",
  inline = false,
}: HeartLoadingProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const content = (
    <>
      <div className="heart-spin">
        <Image
          src="/loading.png"
          alt="Loading heart"
          width={size === "small" ? 24 : size === "medium" ? 32 : 40}
          height={size === "small" ? 24 : size === "medium" ? 32 : 40}
          className="heart-icon"
        />
      </div>
      <div className="loading-text">
        იტვირთება
        <span className="dots">{dots}</span>
      </div>
    </>
  );

  return inline ? (
    <span className={`heart-loading ${size} inline`}>{content}</span>
  ) : (
    <div className={`heart-loading ${size}`}>{content}</div>
  );
}
