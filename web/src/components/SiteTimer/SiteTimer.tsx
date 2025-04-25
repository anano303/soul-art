"use client";

import React, { useState, useEffect } from "react";
import "./SiteTimer.css";
import { OptimizedStaticImage } from "../optimized-static-image";

// Import gear images directly where they're used
import gear1 from "../../assets/gear 1.png";
import gear2 from "../../assets/gear 2.png";
import gear3 from "../../assets/gear 3.png";

// 📅 დროის გამოთვლა
const startDate = new Date("2025-04-01T00:00:00"); //დაწყების თარიღი
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
  const days = Math.floor(
    (difference % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)
  );
  const hours = Math.floor(
    (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { months, days, hours, minutes, seconds };
};

// ⏳ Timer კომპონენტი
const SiteTimer = () => {
  const [timeLeft, setTimeLeft] = useState<{
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

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
        <div className="small-anim-logo">
          <div className="small-top-bolt bolt-container rotate-right small-medium">
            <OptimizedStaticImage
              src={gear1}
              alt="Gear 1"
              className="bolt-image"
              width={30}
              height={30}
              loading="eager"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
          <div className="small-bottom-bolts">
            <div className="bolt-container rotate-left small-small">
              <OptimizedStaticImage
                src={gear2}
                alt="Gear 2"
                className="bolt-image"
                width={15}
                height={15}
                loading="eager"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
            <div className="bolt-container rotate-right small-large">
              <OptimizedStaticImage
                src={gear3}
                alt="Gear 3"
                className="bolt-image"
                width={45}
                height={45}
                loading="eager"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
          </div>
        </div>
        <p className="site-timer-text">Loading timer...</p>
      </div>
    );
  }

  return (
    <div className="site-timer-container">
      <div className="small-anim-logo">
        <div className="small-top-bolt bolt-container rotate-right small-medium">
          <OptimizedStaticImage
            src={gear1}
            alt="Gear 1"
            className="bolt-image"
            width={30}
            height={30}
            loading="eager"
            style={{ width: "auto", height: "auto" }}
          />
        </div>
        <div className="small-bottom-bolts">
          <div className="bolt-container rotate-left small-small">
            <OptimizedStaticImage
              src={gear2}
              alt="Gear 2"
              className="bolt-image"
              width={15}
              height={15}
              loading="eager"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
          <div className="bolt-container rotate-right small-large">
            <OptimizedStaticImage
              src={gear3}
              alt="Gear 3"
              className="bolt-image"
              width={45}
              height={45}
              loading="eager"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
        </div>
      </div>
      <p className="site-timer-text">
        ვებგვერდზე მიმდინარეობს ტექნიკური სამუშაო, დასრულებამდე დარჩა{" "}
        {timeLeft.months > 0 &&
          `${timeLeft.months.toString().padStart(2, "")} თვე `}
        {timeLeft.days > 0 &&
          `${timeLeft.days.toString().padStart(2, "")} დღე `}
        {timeLeft.hours.toString().padStart(2, "0")} :{" "}
        {timeLeft.minutes.toString().padStart(2, "0")} :{" "}
        {timeLeft.seconds.toString().padStart(2, "0")}
      </p>
    </div>
  );
};

export default SiteTimer;
