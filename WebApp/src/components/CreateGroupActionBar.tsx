import React from 'react';
import { ArrowRight, Bookmark, RotateCcw } from 'lucide-react';

interface CreateGroupActionBarProps {
  onCancel: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  isSubmitting?: boolean;
}

export const CreateGroupActionBar: React.FC<CreateGroupActionBarProps> = ({
  onCancel,
  onSaveDraft,
  onContinue,
  isSubmitting = false
}) => {
  return (
    <footer className="fixed-action-bar" aria-label="Group Creation Actions">
      <div className="action-bar-inner">
        <div className="action-bar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            <RotateCcw size={15} />
            <span>Reset / Cancel</span>
          </button>
        </div>

        <div className="action-bar-right">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onSaveDraft}
          >
            <Bookmark size={15} />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onContinue}
            disabled={isSubmitting}
          >
            <span>Continue to Review</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
};
