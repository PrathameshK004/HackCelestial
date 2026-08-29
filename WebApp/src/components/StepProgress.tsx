import React from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface StepProgressProps {
  currentStep?: number;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep = 1 }) => {
  const steps = [
    { number: '1', label: 'Details', id: 1 },
    { number: '2', label: 'Travelers', id: 2 },
    { number: '3', label: 'Settings', id: 3 },
    { number: '4', label: 'Review', id: 4 }
  ];

  return (
    <div className="step-progress-wrapper" aria-label="Creation Progress">
      <div className="steps-list">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isPassed = currentStep > step.id;
          const isInactive = currentStep < step.id;

          return (
            <React.Fragment key={step.id}>
              <div className={`step-item ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''} ${isInactive ? 'inactive' : ''}`}>
                <div className="step-indicator">
                  {isPassed ? <Check size={12} strokeWidth={3} /> : step.number}
                </div>
                <div className="step-content">
                  <span className="step-label">{step.label}</span>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="step-separator">
                  <ChevronRight size={14} color="var(--text-muted)" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
