import React from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface StepProgressProps {
  currentStep?: number;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep = 1 }) => {
  const steps = [
    { number: '01', label: 'Trip Details', id: 1 },
    { number: '02', label: 'Travelers', id: 2 },
    { number: '03', label: 'Preferences', id: 3 },
    { number: '04', label: 'Review', id: 4 }
  ];

  return (
    <div className="step-progress-wrapper" aria-label="Creation Progress">
      <ul className="steps-list">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isPassed = currentStep > step.id;
          const isInactive = currentStep < step.id;

          return (
            <React.Fragment key={step.id}>
              <li className={`step-item ${isActive ? 'active' : ''} ${isInactive ? 'inactive' : ''}`}>
                <div className="step-indicator">
                  {isPassed ? <Check size={14} strokeWidth={3} /> : step.number}
                </div>
                <div className="step-content">
                  <span className="step-number">Step {step.number}</span>
                  <span className="step-label">{step.label}</span>
                </div>
              </li>
              {index < steps.length - 1 && (
                <div className="step-separator">
                  <ChevronRight size={16} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ul>
    </div>
  );
};
