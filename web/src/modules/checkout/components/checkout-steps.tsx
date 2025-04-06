import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import './checkout-steps.css';

interface CheckoutStepsProps {
  currentStep: number;
}

const steps = [
  { id: 1, name: 'ავტორიზაცია' },
  { id: 2, name: 'მიწოდება' },
  { id: 3, name: 'გადახდა' },
  { id: 4, name: 'შეკვეთა' },
];

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <div className="checkout-steps-container">
      <nav aria-label="Progress">
        <ol className="steps-list">
          {steps.map((step, stepIdx) => (
            <li
              key={step.name}
              className={cn(
                'step-item',
                stepIdx !== steps.length - 1 ? 'with-connector' : '',
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
