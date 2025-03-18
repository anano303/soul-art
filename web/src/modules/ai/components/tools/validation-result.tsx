"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import "./validation.css";

interface ValidationResultProps {
  isValid: boolean;
  missingFields: string[];
  suggestions: string[];
  marketFitScore: number;
  pricingFeedback: string;
}

export function ValidationResult({
  isValid,
  missingFields,
  suggestions,
  marketFitScore,
  pricingFeedback,
}: ValidationResultProps) {
  if (!isValid) {
    return <div className="card pulse" />;
  }

  const getStatusIcon = () => {
    if (marketFitScore >= 80) return <CheckCircle2 className="textGreen" />;
    if (marketFitScore >= 50) return <AlertCircle className="textYellow" />;
    return <XCircle className="textRed" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="card">
        <div className="statusContainer">
          {getStatusIcon()}
          <div>
            <h3 className="title">Market Fit Score: {marketFitScore}/100</h3>
            <p className="subtitle">
              {isValid
                ? "Product details are complete"
                : "Missing required information"}
            </p>
          </div>
        </div>

        {missingFields.length > 0 && (
          <div className="listContainer">
            <h4 className="listTitle textRed">Missing Fields:</h4>
            <ul className="list">
              {missingFields.map((field, index) => (
                <li key={index} className="listItem textRed">
                  {field}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="listContainer">
          <h4 className="listTitle">Pricing Analysis:</h4>
          <p className="subtitle">{pricingFeedback}</p>
        </div>

        {suggestions.length > 0 && (
          <div className="listContainer">
            <h4 className="listTitle">Suggestions:</h4>
            <ul className="list">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="listItem">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}
