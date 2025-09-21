"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/LanguageContext";
import "./checkout-steps.css";

interface CheckoutStepsProps {
  currentStep: number;
}

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const { t } = useLanguage();

  const steps = [
    { id: 1, name: t("checkout.steps.authorization") },
    { id: 2, name: t("checkout.steps.shipping") },
    { id: 3, name: t("checkout.steps.payment") },
    { id: 4, name: t("checkout.steps.order") },
  ];

  return (
    <div className="checkout-steps-container">
      <nav aria-label="Progress">
        <ol className="steps-list">
          {steps.map((step, stepIdx) => (
            <li
              key={step.name}
              className={cn(
                "step-item",
                stepIdx !== steps.length - 1 ? "with-connector" : ""
              )}
            >
              {step.id < currentStep ? (
                // Completed step
                <div className="step-content">
                  <span className="step-indicator completed">
                    <Check className="step-icon" />
                  </span>
                  <span className="step-label completed">{step.name}</span>
                </div>
              ) : step.id === currentStep ? (
                // Current step
                <div className="step-content">
                  <span className="step-indicator current">
                    <span className="step-number">{step.id}</span>
                  </span>
                  <span className="step-label current">{step.name}</span>
                </div>
              ) : (
                // Upcoming step
                <div className="step-content">
                  <span className="step-indicator upcoming">
                    <span className="step-number">{step.id}</span>
                  </span>
                  <span className="step-label upcoming">{step.name}</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
