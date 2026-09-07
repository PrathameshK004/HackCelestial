import React from 'react';

interface StepProgressProps {
  currentStep?: number;
  onStepClick?: (step: number) => void;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep = 1, onStepClick }) => {
  const steps = [
    { number: '01', label: 'Trip Details', id: 1 },
    { number: '02', label: 'Travelers', id: 2 },
    { number: '03', label: 'Preferences', id: 3 },
    { number: '04', label: 'Review & Launch', id: 4 }
  ];

  const currentStepObj = steps.find((s) => s.id === currentStep) || steps[0];

  return (
    <div className="clean-step-wrapper" aria-label="Creation Progress">
      <div className="clean-step-header">
        <span className="clean-step-count">Step {currentStep} of 4</span>
        <span className="clean-step-name">{currentStepObj.label}</span>
      </div>

      <div className="clean-step-track">
        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <div
              key={step.id}
              className={`clean-step-bar ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
              title={`Step ${step.number}: ${step.label}`}
              onClick={() => isCompleted && onStepClick && onStepClick(step.id)}
            />
          );
        })}
      </div>
    </div>
  );
};
