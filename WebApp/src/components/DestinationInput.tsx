import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { MOCK_DESTINATIONS } from '../mock/mockData';
import { DestinationOption } from '../types/group';

interface DestinationInputProps {
  value: string;
  onChange: (val: string) => void;
  startDateFormatted?: string;
  endDateFormatted?: string;
  durationDays?: number;
  error?: string;
}

export const DestinationInput: React.FC<DestinationInputProps> = ({
  value,
  onChange,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = MOCK_DESTINATIONS.filter((d) =>
    `${d.city}, ${d.country}`.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (dest: DestinationOption) => {
    const formatted = `${dest.city}, ${dest.country}`;
    onChange(formatted);
    setQuery(formatted);
    setIsOpen(false);
  };

  return (
    <div className="form-group destination-container" ref={dropdownRef}>
      <label className="form-label" htmlFor="destination-input">
        Destination <span className="required-star">*</span>
      </label>
      <div className="input-with-icon">
        <div className="input-icon">
          <Search size={18} />
        </div>
        <input
          id="destination-input"
          type="text"
          className={`text-input ${error ? 'has-error' : ''}`}
          placeholder="Where are you going? (e.g. Goa, India)"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          autoComplete="off"
        />
      </div>

      {error && <div className="field-error-msg">{error}</div>}

      {isOpen && filtered.length > 0 && (
        <div className="destination-suggestions-dropdown">
          {filtered.map((item) => (
            <div
              key={`${item.city}-${item.country}`}
              className="suggestion-item"
              onClick={() => handleSelect(item)}
            >
              <div>
                <span className="suggestion-city">{item.city}</span>
                <span className="suggestion-country">, {item.country}</span>
              </div>
              <span className="suggestion-tag">
                <Sparkles size={11} style={{ display: 'inline', marginRight: '4px' }} />
                {item.tag}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
