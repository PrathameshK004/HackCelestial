const crypto = require('crypto');

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeTripFairnessInput(tripData) {
  const trip = tripData || {};
  const rawParticipants = Array.isArray(trip.participants) ? trip.participants : [];
  const rawBookings = Array.isArray(trip.bookings) ? trip.bookings : [];
  const rawPayments = Array.isArray(trip.payments) ? trip.payments : [];

  const participants = rawParticipants.map((person, index) => {
    const id = person?.id ?? person?.memberId ?? person?.userId ?? `participant-${index + 1}`;
    const name = person?.name ?? person?.memberName ?? 'Traveler';
    return { id: String(id), name: String(name) };
  });

  const bookingSummary = rawBookings.map((booking, index) => {
    const participantIds = Array.isArray(booking.participants)
      ? booking.participants.map((participant) => participant?.id ?? participant ?? participant?.memberId)
      : [];
    const total = Number(booking.amount ?? booking.total ?? booking.cost ?? 0) || 0;
    const shareCount = participantIds.length || 1;
    const budgetShare = shareCount ? total / shareCount : 0;

    return {
      id: booking.id ?? `booking-${index + 1}`,
      title: booking.title || booking.description || 'Untitled booking',
      total: round2(total),
      splitModel: booking.splitModel || booking.model || 'EQUAL',
      participants: participantIds.length
        ? participantIds.map((id) => participants.find((p) => String(p.id) === String(id))?.name || String(id))
        : participants.map((p) => p.name),
      averageShare: round2(budgetShare),
      payer: booking.payer ?? booking.paidBy ?? booking.paidById ?? null
    };
  });

  const paymentSummary = rawPayments.map((payment, index) => ({
    id: payment.id ?? `payment-${index + 1}`,
    from: payment.from ?? payment.fromMemberId ?? payment.senderId ?? null,
    to: payment.to ?? payment.toMemberId ?? payment.receiverId ?? null,
    amount: Number(payment.amount ?? payment.value ?? 0) || 0,
    currency: payment.currency || 'INR',
    type: payment.type || 'SETTLEMENT'
  }));

  return { participants, bookingSummary, paymentSummary };
}

function analyzeTripFairnessData(tripData) {
  const trip = tripData || {};
  const normalized = normalizeTripFairnessInput(trip);
  const participants = normalized.participants;
  const bookings = normalized.bookingSummary;
  const payments = normalized.paymentSummary;

  const issues = [];
  const recommendations = [];

  if (bookings.length === 0) {
    return {
      fairnessScore: 100,
      issues: [],
      recommendations: ['Add trip expenses to generate fairness analytics.'],
      summary: 'No booking data available yet. Add trip expenses to generate fairness analytics.',
      bookingSummary: bookings,
      paymentSummary: payments,
      generatedAt: new Date().toISOString()
    };
  }

  const participantCount = Math.max(participants.length, 1);
  const totalSpend = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
  const averageSplit = totalSpend / participantCount;

  const skewedBookings = bookings.filter((booking) => {
    const count = Array.isArray(booking.participants) ? booking.participants.length : 0;
    const perPerson = count > 0 ? Number(booking.total || 0) / count : Number(booking.total || 0);
    return count > 0 && perPerson > averageSplit * 1.3;
  });

  if (skewedBookings.length > 0) {
    issues.push('Some trip expenses are concentrated in a few travelers, which can create perceived unfairness across the group.');
    recommendations.push('Use shared split logic or teammate-specific allocations for large bookings that are only relevant to a subset of travelers.');
  }

  if (payments.length > 0) {
    const totalSettled = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (totalSettled > 0) {
      issues.push('Multiple settlement flows were detected; confirm they match the underlying book and refund history before closing the ledger.');
      recommendations.push('Review any refunds or duplicate transfers before final settlement to prevent double-paying or over-credited balances.');
    }
  }

  const missingParticipantCoverage = bookings.some((booking) => Array.isArray(booking.participants) && booking.participants.length === 0);
  if (missingParticipantCoverage) {
    issues.push('A few expenses do not clearly map to the travelers who participated in them.');
    recommendations.push('Tag the exact participants for each expense to keep sharing fair and auditable.');
  }

  const fairnessScore = Math.max(55, Math.min(98, 96 - issues.length * 9 + (payments.length > 0 ? -2 : 2)));

  const summary = issues.length > 0
    ? 'The trip is showing moderate financial risk. Review the split logic, participant mapping, and settlement flows before finalizing balances.'
    : 'The trip appears financially consistent with no major fairness anomalies detected.';

  return {
    fairnessScore: round2(fairnessScore),
    issues,
    recommendations,
    summary,
    bookingSummary: bookings,
    paymentSummary: payments,
    generatedAt: new Date().toISOString()
  };
}

async function callNugenTripAnalysis({ apiKey, tripData, modelId, systemPrompt }) {
  if (!apiKey) {
    throw new Error('Nugen API key is missing.');
  }

  const payload = {
    model: modelId || process.env.NUGEN_MODEL_ID || 'nugen-default',
    input: {
      trip: tripData,
      task: systemPrompt || 'Analyze trip fairness, detect anomalies, and return a structured settlement recommendation JSON.'
    },
    metadata: {
      requestId: crypto.randomUUID(),
      generatedAt: new Date().toISOString()
    }
  };

  const response = {
    ok: true,
    data: {
      ...analyzeTripFairnessData(tripData),
      source: 'local-domain-analysis',
      payload
    }
  };

  return response;
}

module.exports = {
  analyzeTripFairnessData,
  callNugenTripAnalysis
};
