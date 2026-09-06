import React from 'react';
import { ArrowRight, ArrowLeft, Bookmark, RotateCcw } from 'lucide-react';

interface CreateGroupActionBarProps {
  currentStep: number;
  onPrev: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onReset: () => void;
  isSubmitting?: boolean;
}

export const CreateGroupActionBar: React.FC<CreateGroupActionBarProps> = ({
  currentStep,
  onPrev,
  onNext,
  onSaveDraft,
  onReset,
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
        {/* Primary Next Action */}
        <div className="action-bar-primary-mobile">
          <button
            type="button"
            className="btn btn-primary action-btn-continue"
            onClick={onNext}
            disabled={isSubmitting}
          >
            <span>{getNextLabel()}</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Secondary Back / Draft / Reset Action */}
        <div className="action-bar-secondary-mobile">
          {currentStep > 1 ? (
            <button
              type="button"
              className="btn btn-secondary action-btn-reset"
              onClick={onPrev}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary action-btn-reset"
              onClick={onReset}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline action-btn-draft"
            onClick={onSaveDraft}
          >
            <Bookmark size={14} />
            <span>Save Draft</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
