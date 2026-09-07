import React from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface CreateGroupActionBarProps {
  currentStep: number;
  onPrev: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
}

export const CreateGroupActionBar: React.FC<CreateGroupActionBarProps> = ({
  currentStep,
  onPrev,
  onNext,
  isSubmitting = false
}) => {
  const getNextLabel = () => {
    switch (currentStep) {
      case 1:
        return 'Next: Add Travelers';
      case 2:
        return 'Next: Preferences';
      case 3:
        return 'Review & Confirm';
      default:
        return 'Continue';
    }
  };

  return (
    <footer className="fixed-action-bar" aria-label="Group Creation Actions">
      <div className="action-bar-inner">
        {currentStep > 1 && (
          <button
            type="button"
            className="btn btn-secondary action-btn-reset"
            onClick={onPrev}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary action-btn-continue"
          style={{ flex: 1 }}
          onClick={onNext}
          disabled={isSubmitting}
        >
          <span>{getNextLabel()}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </footer>
  );
};
