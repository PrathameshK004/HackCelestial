import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react-native';
import { colors, radii } from '../../theme/colors';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (isoDate: string) => void;
  selectedDate?: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  title?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  minDate,
  maxDate,
  title = 'Select Date',
}) => {
  const initialDate = selectedDate ? new Date(selectedDate) : (minDate ? new Date(minDate) : new Date());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear() || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth() ?? new Date().getMonth());
  const [activeDate, setActiveDate] = useState<string>(selectedDate || '');
  const [viewMode, setViewMode] = useState<'days' | 'years'>('days');

  useEffect(() => {
    if (selectedDate) {
      setActiveDate(selectedDate);
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    } else if (minDate) {
      const d = new Date(minDate);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
    if (visible) {
      setViewMode('days');
    }
  }, [selectedDate, minDate, visible]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Days in current month calculation
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handleDayPress = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const isoString = `${currentYear}-${formattedMonth}-${formattedDay}`;

    if (minDate && isoString < minDate) {
      return;
    }
    if (maxDate && isoString > maxDate) {
      return;
    }

    setActiveDate(isoString);
    onSelectDate(isoString);
    onClose();
  };

  // Generate day cells
  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ key: `empty-${i}`, empty: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(d).padStart(2, '0');
    const isoString = `${currentYear}-${formattedMonth}-${formattedDay}`;
    const isDisabled = Boolean(
      (minDate && isoString < minDate) || (maxDate && isoString > maxDate)
    );
    const isSelected = activeDate === isoString;

    days.push({
      key: `day-${d}`,
      day: d,
      isoString,
      isDisabled,
      isSelected,
      empty: false,
    });
  }

  // Generate years range for quick selection
  const maxYear = maxDate ? new Date(maxDate).getFullYear() : new Date().getFullYear() + 5;
  const minYear = minDate ? new Date(minDate).getFullYear() : 1940;
  const years = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isTodayDisabled = Boolean(
    (minDate && todayIso < minDate) || (maxDate && todayIso > maxDate)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Top Handle */}
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <CalendarIcon size={18} color={colors.primary600} style={{ marginRight: 6 }} />
                  <Text style={styles.headerTitle}>{title}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {viewMode === 'years' ? (
                <View style={styles.yearPickerContainer}>
                  <View style={styles.yearPickerHeader}>
                    <Text style={styles.yearPickerSubtitle}>Select Year</Text>
                    <TouchableOpacity
                      onPress={() => setViewMode('days')}
                      style={styles.backToCalendarBtn}
                    >
                      <Text style={styles.backToCalendarText}>Back to Calendar</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.yearGrid}>
                    {years.slice(0, 48).map((yr) => {
                      const isYearSelected = yr === currentYear;
                      return (
                        <TouchableOpacity
                          key={yr}
                          style={[
                            styles.yearCell,
                            isYearSelected && styles.yearCellSelected,
                          ]}
                          onPress={() => {
                            setCurrentYear(yr);
                            setViewMode('days');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.yearText,
                              isYearSelected && styles.yearTextSelected,
                            ]}
                          >
                            {yr}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <>
                  {/* Month Navigator with Year Clickable Dropdown Trigger */}
                  <View style={styles.monthNav}>
                    <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
                      <ChevronLeft size={20} color="#1C1C1E" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setViewMode('years')}
                      style={styles.monthYearSelectorBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.monthTitle}>
                        {MONTH_NAMES[currentMonth]} {currentYear}
                      </Text>
                      <Text style={styles.yearBadgeText}>▼</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
                      <ChevronRight size={20} color="#1C1C1E" />
                    </TouchableOpacity>
                  </View>

                  {/* Weekday Row */}
                  <View style={styles.weekdayRow}>
                    {WEEKDAYS.map((w, idx) => (
                      <Text key={idx} style={styles.weekdayText}>{w}</Text>
                    ))}
                  </View>

                  {/* Days Grid */}
                  <View style={styles.daysGrid}>
                    {days.map((item) => {
                      if (item.empty) {
                        return <View key={item.key} style={styles.dayCell} />;
                      }

                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.dayCell,
                            item.isSelected && styles.dayCellSelected,
                          ]}
                          disabled={item.isDisabled}
                          onPress={() => item.day && handleDayPress(item.day)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              item.isDisabled && styles.dayTextDisabled,
                              item.isSelected && styles.dayTextSelected,
                            ]}
                          >
                            {item.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Today Quick Select (only if today is valid) */}
                  {!isTodayDisabled && (
                    <View style={styles.footerRow}>
                      <TouchableOpacity
                        style={styles.todayBtn}
                        onPress={() => {
                          setActiveDate(todayIso);
                          onSelectDate(todayIso);
                          onClose();
                        }}
                      >
                        <Text style={styles.todayBtnText}>Select Today</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: '#059669',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  dayTextDisabled: {
    color: '#D1D5DB',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  todayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  monthYearSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  yearBadgeText: {
    fontSize: 10,
    color: '#6B7280',
  },
  yearPickerContainer: {
    paddingVertical: 4,
  },
  yearPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  yearPickerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  backToCalendarBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
  },
  backToCalendarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    maxHeight: 220,
  },
  yearCell: {
    width: '23%',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  yearCellSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  yearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  yearTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
