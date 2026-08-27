import React from 'react';
import { AlignLeft } from 'lucide-react';

interface TripDescriptionProps {
  description: string;
  onChange: (desc: string) => void;
  maxLength?: number;
}

export const TripDescription: React.FC<TripDescriptionProps> = ({
  description,
  onChange,
  maxLength = 400
}) => {
  return (
    <div className="form-section-card">
      <div className="section-header">
        <div className="section-title-row">
          <h3 className="section-title">
            <AlignLeft size={20} className="section-title-icon" />
            Trip Description
          </h3>
        </div>
        <p className="section-subtitle">Add notes, trip expectations, or shared itinerary details.</p>
      </div>

      <div className="form-group">
        <div className="textarea-wrapper">
          <textarea
            className="textarea-input"
            rows={3}
            placeholder="Tell your group what to expect (e.g. Annual friends trip to Goa with beaches, activities, food and sightseeing)..."
            value={description}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="char-counter">
            {description.length} / {maxLength} characters
          </span>
        </div>
      </div>
    </div>
  );
};
