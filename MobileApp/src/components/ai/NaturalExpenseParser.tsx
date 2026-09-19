/**
 * Natural Language Expense Parser with Graceful Offline Detection
 * When offline: Displays clear notice & runs deterministic local regex parser
 * When online: Indicates connectivity status
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Sparkles, ArrowRight, WifiOff, CheckCircle2 } from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { useSync } from '../../context/SyncContext';
import { Participant, CostSharingModel } from '../../types';

interface NaturalExpenseParserProps {
  members: Participant[];
  onParsedExpense: (parsed: {
    title: string;
    amount: number;
    category: 'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other';
    paidById: string;
    paidByName: string;
    splitModel: CostSharingModel;
  }) => void;
}

export const NaturalExpenseParser: React.FC<NaturalExpenseParserProps> = ({
  members,
  onParsedExpense,
}) => {
  const { isOnline } = useSync();
  const [input, setInput] = useState('');

  const handleParse = () => {
    if (!input.trim()) {
      Alert.alert('Empty Input', 'Please type an expense sentence, e.g.: "Dinner 3500 paid by Rahul"');
      return;
    }

    // Deterministic local regex parser (works 100% offline)
    const text = input.trim();
    
    // Extract amount: ₹4500 or 4500 or rs 4500
    const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    // Extract category
    let category: 'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other' = 'Food';
    const lower = text.toLowerCase();
    if (lower.includes('hotel') || lower.includes('stay') || lower.includes('resort') || lower.includes('villa') || lower.includes('room')) {
      category = 'Stay';
    } else if (lower.includes('cab') || lower.includes('taxi') || lower.includes('flight') || lower.includes('petrol') || lower.includes('train')) {
      category = 'Transport';
    } else if (lower.includes('trek') || lower.includes('cruise') || lower.includes('ticket') || lower.includes('scuba') || lower.includes('activity')) {
      category = 'Activities';
    } else if (lower.includes('beer') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('cafe') || lower.includes('food') || lower.includes('breakfast')) {
      category = 'Food';
    }

    // Extract payer
    let payer = members[0];
    for (const m of members) {
      if (lower.includes(m.name.toLowerCase().split(' ')[0])) {
        payer = m;
        break;
      }
    }

    // Extract title
    let title = text.replace(/(?:₹|rs\.?|inr)?\s*\d+(?:\.\d{1,2})?/i, '').replace(/paid by [a-z]+/i, '').trim();
    if (!title || title.length < 3) {
      title = `${category} Expense`;
    }

    if (amount <= 0) {
      Alert.alert('Amount Missing', 'Could not detect amount. Please include a number, e.g. "Dinner 2500".');
      return;
    }

    onParsedExpense({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      amount,
      category,
      paidById: payer.id,
      paidByName: payer.name,
      splitModel: 'EQUAL',
    });

    setInput('');
    Alert.alert(
      'Expense Parsed',
      `Parsed: "${title}" • ₹${amount.toLocaleString()} paid by ${payer.name}`
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Sparkles size={12} color="#ffffff" />
          <Text style={styles.badgeText}>Quick AI Parser</Text>
        </View>

        {!isOnline ? (
          <View style={styles.offlineStatus}>
            <WifiOff size={11} color={colors.accentAmber} />
            <Text style={styles.offlineStatusText}>Deterministic Local Mode</Text>
          </View>
        ) : (
          <View style={styles.onlineStatus}>
            <CheckCircle2 size={11} color={colors.primary600} />
            <Text style={styles.onlineStatusText}>Online Assistant</Text>
          </View>
        )}
      </View>

      <Text style={styles.label}>Type in plain English:</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder='e.g. "Dinner 4200 paid by Yogesh"'
          placeholderTextColor={colors.slate400}
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={styles.parseBtn} onPress={handleParse} activeOpacity={0.8}>
          <ArrowRight size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <Text style={styles.offlineHint}>
          You're offline. Deterministic rule parser is active. Advanced LLM assistant features require reconnecting.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    marginBottom: 14,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate900,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    gap: 5,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentAmberLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  offlineStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#92400e',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  onlineStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.primary700,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate500,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: colors.slate800,
  },
  parseBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  offlineHint: {
    fontSize: 10,
    color: colors.slate400,
    marginTop: 6,
    lineHeight: 14,
  },
});
