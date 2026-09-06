import React from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface StepProgressProps {
  currentStep?: number;
  onStepClick?: (step: number) => void;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep = 1, onStepClick }) => {
  const steps = [
    { number: '01', label: 'Trip Details', id: 1 },
    { number: '02', label: 'Travelers', id: 2 },
    { number: '03', label: 'Preferences', id: 3 },
    { number: '04', label: 'Review', id: 4 }
  ];

  const currentStepObj = steps.find((s) => s.id === currentStep) || steps[0];

  return (
    <div className="step-progress-wrapper" aria-label="Creation Progress">
      {/* Mobile-First Segmented Progress Bar (< 680px) */}
      <div className="mobile-step-container">
        <div className="mobile-step-header">
          <span className="mobile-step-badge">Step {currentStep} of 4</span>
          <span className="mobile-step-title">{currentStepObj.label}</span>
        </div>
        <div className="mobile-step-track">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <div
                key={step.id}
                className={`mobile-step-bar ${isCompleted ? 'completed clickable' : ''} ${isCurrent ? 'current' : ''}`}
                title={`Step ${step.number}: ${step.label}`}
                onClick={() => isCompleted && onStepClick && onStepClick(step.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Desktop Stepper (>= 680px) */}
      <ul className="steps-list desktop-step-list">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isPassed = currentStep > step.id;
          const isInactive = currentStep < step.id;

          return (
            <React.Fragment key={step.id}>
              <li 
                className={`step-item ${isActive ? 'active' : ''} ${isInactive ? 'inactive' : ''} ${isPassed ? 'clickable' : ''}`}
                onClick={() => isPassed && onStepClick && onStepClick(step.id)}
                style={{ cursor: isPassed ? 'pointer' : 'default' }}
              >
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
