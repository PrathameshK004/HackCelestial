import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  durationDays: number;
  startDateError?: string;
  endDateError?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  durationDays,
  startDateError,
  endDateError
}) => {
  return (
    <div className="form-group">
      <div className="dates-grid">
        <div>
          <label className="form-label" htmlFor="start-date-input">
            Start Date <span className="required-star">*</span>
          </label>
          <div className="input-with-icon">
            <div className="input-icon">
              <Calendar size={18} />
            </div>
            <input
              id="start-date-input"
              type="date"
              className={`text-input ${startDateError ? 'has-error' : ''}`}
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          {startDateError && <div className="field-error-msg">{startDateError}</div>}
        </div>

        <div>
          <label className="form-label" htmlFor="end-date-input">
            End Date <span className="required-star">*</span>
          </label>
          <div className="input-with-icon">
            <div className="input-icon">
              <Calendar size={18} />
            </div>
            <input
              id="end-date-input"
              type="date"
              className={`text-input ${endDateError ? 'has-error' : ''}`}
              value={endDate}
              min={startDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
          {endDateError && <div className="field-error-msg">{endDateError}</div>}
        </div>
      </div>

      {startDate && endDate && durationDays > 0 && (
        <div className="duration-indicator-pill">
          <Clock size={13} />
          <span>Calculated Trip Duration: <strong>{durationDays} {durationDays === 1 ? 'Day' : 'Days'}</strong></span>
        </div>
      )}
    </div>
  );
};
