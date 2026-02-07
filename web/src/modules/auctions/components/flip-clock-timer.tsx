"use client";

import React, { useEffect, useState, useRef } from "react";
import "./flip-clock-timer.css";

interface FlipClockTimerProps {
  endDate: Date | string;
  onTimeEnd?: () => void;
  isExtended?: boolean;
  language?: "ge" | "en";
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const FlipDigit: React.FC<{ digit: string; prevDigit: string }> = ({
  digit,
  prevDigit,
}) => {
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (digit !== prevDigit) {
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 600);
      return () => clearTimeout(timer);
    }
  }, [digit, prevDigit]);

  return (
    <div className={`flip-card ${isFlipping ? "flip" : ""}`}>
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <span>{isFlipping ? prevDigit : digit}</span>
        </div>
        <div className="flip-card-back">
          <span>{digit}</span>
        </div>
      </div>
      <div className="flip-card-top-half">
        <span>{digit}</span>
      </div>
      <div className="flip-card-bottom-half">
        <span>{digit}</span>
      </div>
    </div>
  );
};

const FlipUnit: React.FC<{
  value: number;
  prevValue: number;
  label: string;
}> = ({ value, prevValue, label }) => {
  const currentStr = value.toString().padStart(2, "0");
  const prevStr = prevValue.toString().padStart(2, "0");

  return (
    <div className="flip-unit">
      <div className="flip-unit-digits">
        <FlipDigit digit={currentStr[0]} prevDigit={prevStr[0]} />
        <FlipDigit digit={currentStr[1]} prevDigit={prevStr[1]} />
      </div>
      <span className="flip-unit-label">{label}</span>
    </div>
  );
};

export const FlipClockTimer: React.FC<FlipClockTimerProps> = ({
  endDate,
  onTimeEnd,
  isExtended = false,
  language = "ge",
}) => {
  // Convert to timestamp for stable dependency
  const endTimestamp = new Date(endDate).getTime();
  
  // Use ref for callback to avoid interval restarts
  const onTimeEndRef = useRef(onTimeEnd);
  useEffect(() => {
    onTimeEndRef.current = onTimeEnd;
  }, [onTimeEnd]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => {
    const now = Date.now();
    const difference = endTimestamp - now;
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference,
    };
  });
  const [prevTimeLeft, setPrevTimeLeft] = useState<TimeLeft>(timeLeft);
  const hasEndedRef = useRef(false);

  useEffect(() => {
    // Reset state when endTimestamp changes
    hasEndedRef.current = false;
    const now = Date.now();
    const difference = endTimestamp - now;
    const initial = difference <= 0
      ? { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
      : {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          total: difference,
        };
    setTimeLeft(initial);
    setPrevTimeLeft(initial);

    const timer = setInterval(() => {
      const now = Date.now();
      const difference = endTimestamp - now;
      
      const newTimeLeft = difference <= 0
        ? { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
        : {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / (1000 * 60)) % 60),
            seconds: Math.floor((difference / 1000) % 60),
            total: difference,
          };

      setTimeLeft((prev) => {
        setPrevTimeLeft(prev);
        return newTimeLeft;
      });

      if (newTimeLeft.total <= 0 && !hasEndedRef.current) {
        hasEndedRef.current = true;
        onTimeEndRef.current?.();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTimestamp]);

  const labels = {
    ge: { days: "დღე", hours: "სთ", minutes: "წთ", seconds: "წმ" },
    en: { days: "Days", hours: "Hrs", minutes: "Min", seconds: "Sec" },
  };

  const currentLabels = labels[language];
  const isUrgent = timeLeft.total <= 60000; // Last minute
  const isWarning = timeLeft.total <= 300000 && !isUrgent; // Last 5 minutes

  return (
    <div
      className={`flip-clock-container ${isExtended ? "extended" : ""} ${isUrgent ? "urgent" : ""} ${isWarning ? "warning" : ""}`}
    >
      {isExtended && (
        <div className="extension-badge">
          <span className="extension-icon">⏰</span>
          <span>
            {language === "ge" ? "+10 წამი დაემატა!" : "+10 seconds added!"}
          </span>
        </div>
      )}

      <div className="flip-clock">
        {timeLeft.days > 0 && (
          <>
            <FlipUnit
              value={timeLeft.days}
              prevValue={prevTimeLeft.days}
              label={currentLabels.days}
            />
            <span className="flip-separator">:</span>
          </>
        )}
        <FlipUnit
          value={timeLeft.hours}
          prevValue={prevTimeLeft.hours}
          label={currentLabels.hours}
        />
        <span className="flip-separator">:</span>
        <FlipUnit
          value={timeLeft.minutes}
          prevValue={prevTimeLeft.minutes}
          label={currentLabels.minutes}
        />
        <span className="flip-separator">:</span>
        <FlipUnit
          value={timeLeft.seconds}
          prevValue={prevTimeLeft.seconds}
          label={currentLabels.seconds}
        />
      </div>

      {timeLeft.total <= 0 && (
        <div className="auction-ended-overlay">
          <span>{language === "ge" ? "აუქციონი დასრულდა" : "Auction Ended"}</span>
        </div>
      )}
    </div>
  );
};

export default FlipClockTimer;
