"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { StaticImageData } from "next/image";
import gear1 from "../../assets/gear 1.png";
import gear2 from "../../assets/gear 2.png";
import gear3 from "../../assets/gear 3.png";
import "./SiteTimer.css";

// ⚙️ Bolt კომპონენტი 
const Bolt: React.FC<{ size: string; direction: string; src: StaticImageData }> = ({ size, direction, src }) => (
  <div className={`bolt-container ${size} ${direction}`}>
    <Image src={src} alt={`${size} bolt`} className={`bolt-image ${size}`} priority />
  </div>
);

// 🔧 ლოგო ანიმაცია 
const SmallAnimLogo = () => {
  return (
    <div className="small-anim-logo">
      <div className="small-top-bolt">
        <Bolt size="small-medium" direction="rotate-left" src={gear2} />
      </div>
      <div className="small-bottom-bolts">
        <Bolt size="small-large" direction="rotate-right" src={gear1} />
        <Bolt size="small-small" direction="rotate-right" src={gear3} />
      </div>
    </div>
  );
};

// 📅 დროის გამოთვლა
const startDate = new Date("2025-03-01T00:00:00"); //დაწყების თარიღი
const durationInDays = 60; //დასრულების დრო
const endDate = new Date(startDate);
endDate.setDate(startDate.getDate() + durationInDays);

// ⏱️ დროის გამოთვლის ფუნქცია
const calculateTimeLeft = (end: Date) => {
  const now = new Date();
  const difference = end.getTime() - now.getTime();

  if (difference <= 0) {
    return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const months = Math.floor(difference / (1000 * 60 * 60 * 24 * 30));
  const days = Math.floor((difference % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { months, days, hours, minutes, seconds };
};

// ⏳ Timer კომპონენტი
const SiteTimer = () => {
  const [timeLeft, setTimeLeft] = useState<{ months: number; days: number; hours: number; minutes: number; seconds: number } | null>(null);


  useEffect(() => {
    const updateTimer = () => {
      setTimeLeft(calculateTimeLeft(endDate));
    };

    updateTimer(); 
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) {
    return (
      <div className="site-timer-container">
        <SmallAnimLogo />
        <p className="site-timer-text">Loading timer...</p>
      </div>
    );
  }

  return (
    <div className="site-timer-container">
      <SmallAnimLogo />
      <p className="site-timer-text">
        ვებგვერდზე მიმდინარეობს ტექნიკური სამუშაო, დასრულებამდე დარჩა{" "}
        {timeLeft.months > 0 && `${timeLeft.months.toString().padStart(2, "")} თვე `}
        {timeLeft.days > 0 && `${timeLeft.days.toString().padStart(2, "")} დღე `}
        {timeLeft.hours.toString().padStart(2, "0")} :{" "}
        {timeLeft.minutes.toString().padStart(2, "0")} :{" "}
        {timeLeft.seconds.toString().padStart(2, "0")}
      </p>
    </div>
  );
};

export default SiteTimer;
