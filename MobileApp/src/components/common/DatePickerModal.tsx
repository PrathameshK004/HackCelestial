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
  title = 'Select Date',
}) => {
  const initialDate = selectedDate ? new Date(selectedDate) : (minDate ? new Date(minDate) : new Date());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear() || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth() ?? new Date().getMonth());
  const [activeDate, setActiveDate] = useState<string>(selectedDate || '');

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
    const isDisabled = Boolean(minDate && isoString < minDate);
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

              {/* Month Navigator */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
                  <ChevronLeft size={20} color="#1C1C1E" />
                </TouchableOpacity>

                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </Text>

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

              {/* Today Quick Select */}
              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={styles.todayBtn}
                  onPress={() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const todayIso = `${year}-${month}-${day}`;
                    if (!minDate || todayIso >= minDate) {
                      setActiveDate(todayIso);
                      onSelectDate(todayIso);
                      onClose();
                    }
                  }}
                >
                  <Text style={styles.todayBtnText}>Select Today</Text>
                </TouchableOpacity>
              </View>
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
});
