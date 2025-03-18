"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Spiner from "../../assets/spiner.png";
import "./loadingAnim.css";

const LoadingAnim = () => {
  const [dots, setDots] = useState("");

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
        width={24} // სურათის სიგანე ტექსტის სიმაღლის შესაბამისად
        height={24} // სურათის სიმაღლე ტექსტის სიმაღლის შესაბამისად
        className="loading-image"
      />
        <p className="loading-text">იტვირთება{dots}</p>
    </div>
  );
};

export default LoadingAnim;
