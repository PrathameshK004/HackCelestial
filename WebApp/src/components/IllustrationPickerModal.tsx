import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Compass,
} from 'lucide-react';
import {
  ILLUSTRATIONS,
  ILLUSTRATION_CATEGORIES,
} from '../constants/illustrations';
import { IllustrationAvatar } from './IllustrationAvatar';

interface IllustrationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIllustrationId?: string | null;
  onSelect: (illustrationId: string | null) => void;
  userName?: string;
}

export const IllustrationPickerModal: React.FC<IllustrationPickerModalProps> = ({
  isOpen,
  onClose,
  selectedIllustrationId,
  onSelect,
  userName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [previewId, setPreviewId] = useState<string | null>(selectedIllustrationId || null);
  const scrollRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPreviewId(selectedIllustrationId || null);
      setSearchQuery('');
      setActiveCategory('all');
    }
  }, [isOpen, selectedIllustrationId]);

  const filteredIllustrations = useMemo(() => {
    let list = [...ILLUSTRATIONS];

    if (activeCategory !== 'all') {
      list = list.filter((item) => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeCategory, searchQuery]);

  const handleApply = () => {
    onSelect(previewId);
    onClose();
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#18181b', // Google illustration picker dark theme
          borderRadius: '24px',
          padding: '24px',
          color: '#f4f4f5',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Live Preview Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: '#27272a',
            borderRadius: '16px',
            padding: '12px 16px',
            marginBottom: '16px',
            border: '1px solid #3f3f46',
          }}
        >
          <IllustrationAvatar avatar={previewId} name={userName} size={54} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
              Selected Illustration
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f4f4f5', marginTop: '2px' }}>
              {previewId
                ? ILLUSTRATIONS.find((i) => i.id === previewId)?.name || 'Custom Illustration'
                : 'Select an illustration'}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#27272a',
            borderRadius: '9999px',
            padding: '8px 16px',
            marginBottom: '14px',
            border: '1px solid #3f3f46',
          }}
        >
          <Search size={17} color="#94a3b8" style={{ marginRight: '10px' }} />
          <input
            type="text"
            placeholder="Search illustrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#f4f4f5',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '14px',
            scrollbarWidth: 'none',
          }}
        >
          {ILLUSTRATION_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: isActive ? '1px solid #059669' : '1px solid #3f3f46',
                  background: isActive ? '#059669' : '#27272a',
                  color: isActive ? '#ffffff' : '#a1a1aa',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Carousel / Grid Wrapper with Floating Navigation Arrows */}
        <div style={{ position: 'relative', margin: '8px 0 20px' }}>
          {/* Left Arrow */}
          <button
            type="button"
            onClick={scrollLeft}
            style={{
              position: 'absolute',
              left: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#1e293b',
            }}
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>

          {/* Grid Container */}
          <div
            ref={scrollRef}
            style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              padding: '8px 12px',
              scrollbarWidth: 'none',
            }}
          >
            {filteredIllustrations.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', width: '100%', color: '#a1a1aa' }}>
                <Compass size={28} style={{ marginBottom: '8px' }} />
                <div>No illustrations matching "{searchQuery}"</div>
              </div>
            ) : (
              [0, 1, 2].map((rowIndex) => (
                <div
                  key={`web-row-${rowIndex}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {filteredIllustrations
                    .filter((_, idx) => idx % 3 === rowIndex)
                    .map((item) => {
                      const isSelected = previewId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setPreviewId(item.id)}
                          style={{
                            position: 'relative',
                            padding: '3px',
                            borderRadius: '50%',
                            border: isSelected ? '2.5px solid #10b981' : '2.5px solid transparent',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                            cursor: 'pointer',
                          }}
                        >
                          <IllustrationAvatar avatar={item.id} size={58} />
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '2px',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: '#10b981',
                                border: '1.5px solid #18181b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                              }}
                            >
                              <Check size={11} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))
            )}
          </div>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={scrollRight}
            style={{
              position: 'absolute',
              right: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#1e293b',
            }}
          >
            <ChevronRight size={20} strokeWidth={2.4} />
          </button>
        </div>

        {/* Actions Row */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: '#27272a',
              border: '1px solid #3f3f46',
              color: '#d4d4d8',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 20px',
              borderRadius: '12px',
              background: '#059669',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <Check size={16} strokeWidth={2.5} />
            <span>Save Profile Picture</span>
          </button>
        </div>
      </div>
    </div>
  );
};
