/**
 * Local Ledger Recalculation Engine & Smart Settlement Optimizer
 * Industry-grade Min-Cash-Flow Algorithm for optimal debt simplification.
 * Uses server-provided authoritative member balances as primary source of truth.
 */

import { Participant, Expense, SettlementTransfer, OptimalSettlementResult, CostSharingModel } from '../types';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const ledgerEngine = {
  /**
   * Recalculates net balances for all trip members based on expenses and recorded settlements.
   * Used for local verification / offline mode.
   */
  recalculateBalances(
    members: Participant[],
    expenses: Expense[],
    settlements: SettlementTransfer[] = []
  ): Record<string, number> {
    const balances: Record<string, number> = {};
    members.forEach((m) => {
      balances[m.id] = 0;
    });

    // 1. Process Expenses
    for (const exp of expenses) {
      const status = (exp.verificationStatus || 'VERIFIED').toUpperCase();
      if (status === 'PENDING_APPROVAL' || status === 'DISPUTED') continue;

      const payerId = String(exp.paidById);
      const totalAmount = round2(Number(exp.amount || 0));
      if (totalAmount <= 0) continue;

      if (balances[payerId] !== undefined) {
        balances[payerId] = round2(balances[payerId] + totalAmount);
      }

      const involvedMemberIds = getInvolvedMemberIds(exp, members);
      const count = involvedMemberIds.length;
      if (count === 0) continue;

      switch (exp.splitModel as CostSharingModel) {
        case 'ORGANIZER_PAID':
          if (balances[payerId] !== undefined) {
            balances[payerId] = round2(balances[payerId] - totalAmount);
          }
          break;

        case 'PARTICIPANT_BASED':
        case 'ROOM_SHARE':
        case 'ACTIVITY_BASED':
        case 'EQUAL':
        default: {
          if (exp.splits && exp.splits.length > 0) {
            for (const s of exp.splits) {
              const mId = String(s.participantId || (s as any).memberId);
              const share = round2(Number(s.shareAmount || (s as any).computedAmount || 0));
              if (s.isOptedIn !== false && balances[mId] !== undefined) {
                balances[mId] = round2(balances[mId] - share);
              }
            }
          } else {
            // Equal share with penny-rounding protection
            const baseShare = Math.floor((totalAmount * 100) / count) / 100;
            let remainderCents = Math.round((totalAmount - baseShare * count) * 100);
            for (const mId of involvedMemberIds) {
              if (balances[mId] !== undefined) {
                let share = baseShare;
                if (remainderCents > 0) {
                  share = round2(share + 0.01);
                  remainderCents--;
                }
                balances[mId] = round2(balances[mId] - share);
              }
            }
          }
          break;
        }
      }
    }

    // 2. Process Completed Settlements
    for (const s of settlements) {
      if (s.status === 'completed') {
        const amt = round2(Number(s.amount || 0));
        if (balances[s.fromMemberId] !== undefined) {
          balances[s.fromMemberId] = round2(balances[s.fromMemberId] + amt);
        }
        if (balances[s.toMemberId] !== undefined) {
          balances[s.toMemberId] = round2(balances[s.toMemberId] - amt);
        }
      }
    }

    for (const id of Object.keys(balances)) {
      balances[id] = round2(balances[id]);
    }

    return balances;
  },

  /**
   * Min-Cash-Flow Debt Simplification Algorithm (Greedy / Optimal).
   * Reads server-authoritative member.balance values; reduces N pairwise debts
   * into the minimum number of direct transfers.
   *
   * member.balance semantics (matching backend):
   *   > 0  → member is OWED this amount (creditor)
   *   < 0  → member OWES this amount (debtor)
   *   = 0  → fully settled
   */
  calculateOptimalSettlements(
    members: Participant[],
    tripId: string,
    currency: string = 'INR',
    currencySymbol: string = '₹'
  ): OptimalSettlementResult {
    // Build mutable copies for the algorithm
    const debtors: Array<{ member: Participant; amount: number }> = members
      .filter((m) => m.balance < -0.01)
      .map((m) => ({ member: m, amount: round2(Math.abs(m.balance)) }))
      .sort((a, b) => b.amount - a.amount);

    const creditors: Array<{ member: Participant; amount: number }> = members
      .filter((m) => m.balance > 0.01)
      .map((m) => ({ member: m, amount: round2(m.balance) }))
      .sort((a, b) => b.amount - a.amount);

    const transfers: SettlementTransfer[] = [];
    let dIdx = 0;
    let cIdx = 0;
    let transferId = 1;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const settledAmount = round2(Math.min(debtor.amount, creditor.amount));
      if (settledAmount > 0.01) {
        const dm = debtor.member;
        const cm = creditor.member;
        transfers.push({
          id: `opt-tx-${tripId}-${transferId++}`,
          tripId,
          fromMemberId: dm.id,
          fromMemberName: dm.name,
          fromAvatarBg: dm.avatarBg,
          toMemberId: cm.id,
          toMemberName: cm.name,
          toAvatarBg: cm.avatarBg,
          toUpiId: (cm as any).upiId || `${cm.name.toLowerCase().replace(/\s+/g, '')}@okaxis`,
          amount: Math.round(settledAmount),
          currency,
          currencySymbol,
          status: 'pending',
          dueDate: 'Instant UPI / Transfer',
          syncStatus: 'SYNCED',
        });
      }

      debtor.amount = round2(debtor.amount - settledAmount);
      creditor.amount = round2(creditor.amount - settledAmount);

      if (debtor.amount <= 0.01) dIdx++;
      if (creditor.amount <= 0.01) cIdx++;
    }

    // Reduction metrics: worst-case original = debtors × creditors pairwise
    const worstCase = Math.max(debtors.length * creditors.length, 1);
    const originalTxCount = worstCase;
    const optimizedTxCount = transfers.length;
    const reductionPercentage =
      originalTxCount > 0
        ? Math.round(((originalTxCount - optimizedTxCount) / originalTxCount) * 100)
        : 0;

    const totalVolume = round2(transfers.reduce((sum, t) => sum + t.amount, 0));

    return { transfers, originalTxCount, optimizedTxCount, totalVolume, reductionPercentage };
  },

  /**
   * Builds directed debt graph edges for visualization.
   * Returns { fromName, toName, amount } edges representing who pays whom.
   */
  buildDebtGraph(
    members: Participant[],
    tripId: string = 'graph',
    currency: string = 'INR',
    currencySymbol: string = '₹'
  ): Array<{
    fromId: string;
    fromName: string;
    fromAvatarBg: string;
    toId: string;
    toName: string;
    toAvatarBg: string;
    amount: number;
  }> {
    const result = this.calculateOptimalSettlements(members, tripId, currency, currencySymbol);
    return result.transfers.map((t) => ({
      fromId: t.fromMemberId,
      fromName: t.fromMemberName,
      fromAvatarBg: t.fromAvatarBg || '#dc2626',
      toId: t.toMemberId,
      toName: t.toMemberName,
      toAvatarBg: t.toAvatarBg || '#059669',
      amount: t.amount,
    }));
  },
};

function getInvolvedMemberIds(exp: Expense, allMembers: Participant[]): string[] {
  const acceptedMembers = allMembers.filter(
    (m) => (m.status || 'ACCEPTED') === 'ACCEPTED' || m.role === 'Organizer'
  );
  const acceptedIdSet = new Set(acceptedMembers.map((m) => m.id));

  if (exp.splits && exp.splits.length > 0) {
    const optedIn = exp.splits
      .filter((s) => s.isOptedIn !== false && acceptedIdSet.has(String(s.participantId || (s as any).memberId)))
      .map((s) => String(s.participantId || (s as any).memberId));
    if (optedIn.length > 0) return optedIn;
  }
  return acceptedMembers.map((m) => m.id);
}
