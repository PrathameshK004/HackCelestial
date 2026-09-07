import React from 'react';
import { Users, Heart, Briefcase, GraduationCap, Compass } from 'lucide-react';
import { TRIP_TYPES } from '../mock/mockData';
import { TripType } from '../types/group';

interface TripTypeSelectorProps {
  selected: TripType;
  onChange: (type: TripType) => void;
}

export const TripTypeSelector: React.FC<TripTypeSelectorProps> = ({ selected, onChange }) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'Friends':
        return <Users size={20} />;
      case 'Family':
        return <Heart size={20} />;
      case 'Corporate':
        return <Briefcase size={20} />;
      case 'Student':
        return <GraduationCap size={20} />;
      default:
        return <Compass size={20} />;
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">Trip Type</label>
      <div className="trip-types-grid" role="radiogroup" aria-label="Trip Type">
        {TRIP_TYPES.map((item) => {
          const isSelected = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`trip-type-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onChange(item.id as TripType)}
            >
              <div className="trip-type-icon">{getIcon(item.id)}</div>
              <span className="trip-type-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
