# GroupTrip Ledger
## Product Requirements Document (PRD) — Multi-Vendor Group Travel Coordination & Settlement Platform

**Version:** 1.0
**Prepared for:** Hackathon Submission
**Document type:** PRD + Workflow + Implementation Plan

---

## 1. Executive Summary

GroupTrip Ledger is a unified platform that lets a trip organizer plan a multi-vendor group itinerary (flights, hotels, activities, local transport) while automatically tracking **who is participating in what**, **who paid for what**, and **who owes whom** — even as the group changes mid-trip (people join/leave, bookings get modified, refunds happen).

The core insight: existing tools solve *either* itinerary planning (TripIt, Wanderlog) *or* expense splitting (Splitwise) — never both, and never in a way where a change to the itinerary (e.g., someone drops out of a rafting trip) automatically and correctly recalculates everyone's financial share. GroupTrip Ledger treats **the itinerary as the source of truth for the ledger**.

---

## 2. Problem Statement

Group travel coordination today is fragmented across:
- Spreadsheets (itinerary, cost breakdown)
- Chat groups (decisions, "who's in?")
- Payment apps (settlements, without itinerary context)

This causes:
- No single source of truth linking **participation** to **cost**
- Manual, error-prone recalculation when plans change
- Confusion over partial participation (not everyone joins every activity)
- No clear picture of shared vs. individual vs. organizer-paid costs
- Disputes over refunds/cancellations and who is owed what

---

## 3. Goals & Non-Goals

### Goals
1. Single unified itinerary + ledger per trip.
2. Flexible participation model — per-booking, per-activity opt-in/opt-out.
3. Automatic, auditable recalculation of shares on any change.
4. Support for multiple cost-sharing models simultaneously within one trip.
5. Clear personal view (my itinerary + my balance) and group view (full financial state).
6. Demonstrate at least one genuinely useful AI-assisted feature (not decorative AI).

### Non-Goals (for hackathon scope)
- Real payment processing/settlement (simulate with "mark as paid" + optional payment link, not actual gateway integration).
- Real vendor booking integration (mock/manual booking entry is fine).
- Multi-currency FX-accurate accounting (basic conversion is a stretch goal only).

---

## 4. Users & Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Organizer** | Plans the trip, creates bookings, adds participants | Full control, override splits, see group financial health |
| **Participant** | Joins some/all activities, pays for some things | See personal itinerary, know what they owe/are owed, pay easily |
| **Payer-on-behalf** | A participant who fronts money for the group (e.g., books the Airbnb) | Get reimbursed accurately and transparently |

---

## 5. Core Concepts / Data Model

Designing the data model correctly is the crux of this problem. Below is the entity relationship logic.

```
Trip
 ├── Participants (many)
 │     - id, name, email, role (organizer/member), status (active/left)
 │
 ├── Bookings (many)         [transport, accommodation, activity, other]
 │     - id, vendor, type, title, dates, total_cost, currency
 │     - cost_sharing_model: EQUAL | PARTICIPANT_BASED | ROOM_SHARE | ACTIVITY_BASED | ORGANIZER_PAID
 │     - status: CONFIRMED | MODIFIED | CANCELLED | REFUNDED
 │     - version_history[] (append-only log of changes)
 │
 ├── BookingParticipants (join table, many-to-many)
 │     - booking_id, participant_id
 │     - share_type: EQUAL_UNIT | FIXED_AMOUNT | PERCENTAGE | ROOM_UNIT
 │     - share_value
 │     - joined_at, left_at (nullable) → enables mid-trip join/leave with correct proration
 │
 ├── Payments (many)
 │     - id, booking_id (nullable, can be trip-level), paid_by (participant_id),
 │       amount, currency, date, method, note
 │
 ├── Adjustments (many)      [refunds, cancellations, extra expenses, corrections]
 │     - id, booking_id, type: REFUND | CANCELLATION | EXTRA_CHARGE | MANUAL_CORRECTION
 │     - amount, reason, affected_participants[], created_at
 │
 └── LedgerEntries (derived/computed, not manually edited)
       - participant_id, booking_id, amount_owed, amount_paid, net_balance
       - This is the OUTPUT of the recalculation engine, not raw input.
```

**Key design principle:** Bookings + Participation + Payments + Adjustments are the *inputs*. The Ledger is always *recomputed*, never hand-edited. This guarantees consistency and gives you a full audit trail — a strong technical story for judges.

---

## 6. Cost-Sharing Models (must support all, per-booking)

| Model | Logic | Example |
|---|---|---|
| **Equal Split** | Total cost ÷ number of active participants in that booking | Dinner split 6 ways |
| **Participant-Based** | Custom fixed amount or percentage per person | One person orders extra, pays more |
| **Shared-Room Allocation** | Cost divided by room occupancy units, not by trip headcount | 2 people in a room split hotel cost between just those 2 |
| **Activity-Based Payment** | Only participants opted into that specific activity pay for it | Scuba diving cost only split among divers |
| **Organizer-Paid / Sponsored** | Organizer (or sponsor) covers full cost, no split | Company-sponsored team dinner |

A single trip can mix all five models across different bookings simultaneously — this is the platform's key differentiator vs. Splitwise-style flat splitting.

---

## 7. Functional Requirements

### 7.1 Itinerary & Booking Management
- Create/edit/cancel bookings across categories: flight, train, cab, hotel, activity, misc.
- Attach vendor name, cost, dates, capacity, and cost-sharing model to each booking.
- Assign participants to a booking (multi-select from group roster).
- Support room/seat sub-grouping within a booking (e.g., Hotel booking → Room 101: Alice + Bob; Room 102: Charlie).

### 7.2 Participant Management
- Add/remove participants at the trip level and at the individual booking level.
- Join/leave mid-trip with an effective date — recalculation must be **prorated**, not retroactively rewriting history unless explicitly a correction.
- Status tracking: invited → confirmed → active → left.

### 7.3 Expense & Payment Tracking
- Log a payment: who paid, how much, for which booking (or general trip fund).
- Support partial payments and overpayments (credit carried forward).
- Support "trip wallet" concept — pooled advance contributions that get drawn down against bookings.

### 7.4 Recalculation Engine (the core differentiator)
- Triggered automatically on: participant join/leave, booking modification, cancellation, refund, extra expense, manual override.
- Recomputes each affected booking's per-person share, then aggregates into each participant's net trip balance.
- Must produce a **change diff**: "Because Priya left the Jaipur activity, your share increased by ₹350."
- All recalculations are logged immutably (event-sourced ledger) for auditability/transparency — this avoids "why did my balance change?!" disputes.

### 7.5 Cancellations, Refunds, Modifications
- Cancel a booking → refund logic distributes recovered amount back proportionally to who paid.
- Partial cancellation (e.g., 2 of 6 people drop an activity) → remaining 4 absorb cost per the booking's sharing model, refund issued to the 2 who left if applicable.
- Booking modification (price change, date change) → re-run recalculation, show diff.

### 7.6 Views & Reporting
- **Personal View:** my itinerary (only bookings I'm part of), my total owed, my total paid, my net balance, suggested settlement actions ("Pay Alice ₹1,200").
- **Group View (organizer):** full itinerary, full ledger, per-participant balances, per-vendor cost breakdown, outstanding amounts, payment status heatmap.
- **Settlement View:** minimal-transaction settlement suggestions (classic debt-simplification algorithm) — "instead of 8 payments, these 3 transactions settle everyone."

### 7.7 Notifications (stretch)
- Notify participants when their share changes and why.
- Reminders for outstanding balances before trip end.

---

## 8. AI / Intelligent Features (Hackathon Differentiators)

These are what will separate this from "just another Splitwise clone" in judging:

1. **Inconsistency Detector** — AI scans bookings/participation data and flags anomalies: a participant paying for an activity they're not listed on, a booking with no participants assigned, a cost-split that doesn't sum to 100%, a refund that doesn't match any cancellation.
2. **Smart Settlement Optimizer** — Debt-simplification algorithm (graph-based min-cash-flow) that reduces N pairwise debts to the minimum number of transactions. (This is a well-known but genuinely impressive algorithm to implement and demo live.)
3. **Natural-Language Expense Entry** — "Alice paid ₹4500 for dinner for everyone except Raj" → auto-parsed into a structured booking/payment/split, powered by an LLM call. Great live demo moment.
4. **Cost-Saving Recommendations** — AI compares group size/dates against booking patterns to suggest, e.g., "Booking as a group of 8 instead of 2x4 could save ~12% on this activity vendor," or flags a cheaper room-sharing configuration.
5. **Fair-Split Suggestion Assistant** — When a booking has ambiguous participation (e.g., some people joined late), AI proposes a fair proration and explains its reasoning in plain language, which the organizer can accept/edit.
6. **Anomaly-Aware Chat Assistant** — A chat interface ("Ledger Assistant") where organizer can ask "Who hasn't paid yet?" or "What happens to the budget if Meera drops out of the trek?" and get a computed, itinerary-aware answer (a "what-if" simulation before committing a change).

**Judging tip:** Feature #2 (settlement optimization) and #6 (what-if simulation) are the highest-leverage for hackathon scoring — they're technically substantive (graph algorithm + simulation engine) rather than "call an LLM and hope," while #3 is the best *demo* moment because it's visually impressive and fast to show.

---

## 9. Workflow (End-to-End)

### 9.1 Organizer Workflow
1. Create Trip → set name, dates, base currency, invite participants.
2. Add Bookings → for each: category, vendor, cost, dates, choose cost-sharing model.
3. Assign Participants → select who's in for this booking (or sub-group into rooms/seats).
4. Log Payments → as they come in, record who paid what, against which booking.
5. Handle Changes → edit/cancel/modify a booking; system prompts "this affects 4 participants, recalculate?"
6. Review Ledger → dashboard shows live balances; run "Settle Up" to get minimal transaction list.
7. Close Trip → final reconciliation, export summary (PDF/CSV) to all participants.

### 9.2 Participant Workflow
1. Accept trip invite → set profile.
2. View "My Itinerary" → see only bookings they're part of.
3. Opt in/out of optional activities → triggers recalculation for that booking.
4. Make a payment → mark as paid, optionally attach proof.
5. View "My Balance" → owed / owes / net, with breakdown by booking.
6. Get notified on changes affecting their balance.

### 9.3 System Recalculation Workflow (internal)
```
Event occurs (join/leave/cancel/modify/payment/refund)
        │
        ▼
Validate event against current trip state
        │
        ▼
Append event to immutable event log
        │
        ▼
Recalculation Engine re-derives:
   - affected booking(s) share breakdown
   - participant-level ledger entries
   - trip-level net balances
        │
        ▼
Generate human-readable diff ("what changed and why")
        │
        ▼
Push update to Personal Views + Group View + Notifications
```

---

## 10. Feature List Summary

### Must-Have (MVP for demo)
- [ ] Trip creation + participant management
- [ ] Booking creation across 4 categories with cost-sharing model selection
- [ ] Assign participants per booking (incl. room/seat sub-grouping)
- [ ] Payment logging
- [ ] Recalculation engine (join/leave/cancel/modify handling)
- [ ] Personal itinerary + balance view
- [ ] Group ledger view
- [ ] Settlement optimizer (min-transaction debt simplification)

### Should-Have (strong differentiators)
- [ ] Change-diff explanations ("why did my balance change")
- [ ] Inconsistency detector
- [ ] Natural-language expense entry (AI)
- [ ] What-if simulation chat assistant

### Nice-to-Have (stretch/polish)
- [ ] Cost-saving recommendation engine
- [ ] Multi-currency support
- [ ] Export to PDF/CSV
- [ ] Payment link integration (mocked)
- [ ] Mobile-responsive PWA

---

## 11. Technical Architecture (Suggested)

```
Frontend: React (Vite) + TailwindCSS
Backend: Node.js/Express or FastAPI (Python) — REST or GraphQL API
Database: PostgreSQL (relational integrity matters here — use it, not NoSQL)
  - Event-sourced ledger table (append-only) + materialized "current balance" view
Recalculation Engine: Pure function module, stateless — takes (trip_state, new_event) → new_state
  - This purity is important: makes it testable and demoable ("run this event, see the diff")
AI Layer: Anthropic API (Claude) for:
  - NL expense parsing (structured JSON output)
  - Inconsistency detection (batch analysis of trip data → flagged issues)
  - What-if chat assistant (tool-use / function-calling against the recalculation engine)
Settlement Algorithm: Custom graph-based min-cash-flow solver (greedy max-debtor/max-creditor matching)
Auth: Simple email/magic-link or mock auth for hackathon speed
Deployment: Vercel/Render/Railway for fast hackathon deployment
```

**Why this architecture wins on technical merit:** treating the ledger as event-sourced + derived state (rather than mutable rows you overwrite) is the single most "senior engineering" decision you can showcase — it directly solves the stated problem of "confusion after changes" and gives you a natural audit log for free.

---

## 12. Implementation Plan (Hackathon Timeline)

Assuming a ~36–48 hour hackathon. Adjust proportionally.

### Phase 0 — Setup (Hours 0–2)
- Repo scaffold, DB schema migration, seed data script for a demo trip.
- Agree on API contract between frontend/backend.

### Phase 1 — Core Data Model & CRUD (Hours 2–8)
- Trip, Participant, Booking, BookingParticipant, Payment models + basic CRUD APIs.
- Basic frontend: create trip, add participants, add bookings.

### Phase 2 — Recalculation Engine (Hours 8–16)
- Implement the 5 cost-sharing model calculators as pure functions.
- Implement event log + recompute-on-event pipeline.
- Unit test with tricky scenarios (mid-trip join, partial cancellation) — this is your technical core, invest here.

### Phase 3 — Views & Settlement (Hours 16–24)
- Personal view, group ledger view.
- Settlement optimizer algorithm + UI ("Settle Up" screen).
- Change-diff explanation generator.

### Phase 4 — AI Features (Hours 24–32)
- NL expense entry via Claude API (structured output parsing).
- Inconsistency detector (batch prompt over trip JSON).
- What-if chat assistant (function-calling into recalculation engine — **do not let it mutate real state**, run against a cloned simulation state).

### Phase 5 — Polish & Demo Prep (Hours 32–40)
- Seed a realistic demo trip (8 people, mixed room-sharing, one dropout mid-trip, one cancellation, one refund).
- Rehearse a scripted demo narrative (see Section 14).
- UI polish, error states, loading states.

### Phase 6 — Buffer / Bug Fixes (remaining hours)
- Fix critical bugs only. Do not add new features close to deadline.

---

## 13. Success Metrics (for judging narrative)

| Metric | Target |
|---|---|
| Recalculation correctness on edge cases (join/leave/cancel/refund combos) | 100% on test scenarios |
| Settlement optimizer transaction reduction | e.g., 10 raw debts → ≤4 transactions |
| Time to log an expense via NL input | < 5 seconds, correct parse |
| Personal view load accuracy | Only shows relevant bookings, correct balance |
| Demo "wow" moment | Live what-if simulation without corrupting real trip state |

---

## 14. Suggested Demo Script (5–7 minutes)

1. **Hook (30s):** "Group trips fall apart financially, not socially. Here's why — and here's the fix."
2. **Setup (1 min):** Show a pre-seeded 8-person trip: flights, shared Airbnb (2 rooms), 3 activities with different opt-ins, organizer-paid dinner.
3. **The problem, live (1.5 min):** One participant drops out of a trek activity mid-trip. Show the automatic recalculation + diff explanation propagating to the other 3 trekkers' balances instantly.
4. **AI moment (1.5 min):** Type in natural language: "Rahul paid 6000 for the cab for everyone except Sara" → watch it become a structured booking/payment. Then ask the chat assistant: "What if Sara also leaves the hotel booking?" → simulated answer without touching real data.
5. **Settlement (1 min):** Hit "Settle Up" — show 8 raw debts collapse into 3 minimal payments.
6. **Close (30s):** Recap: unified itinerary + ledger, always-correct recalculation, AI-assisted entry and insight — built on an event-sourced architecture for full auditability.

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Recalculation logic gets too complex to finish in time | Nail the 3 most common scenarios (equal split, activity-based, room-share) first; participant-based and organizer-paid are simpler variants |
| AI features feel bolted-on | Keep AI scoped to structured tasks (parsing, detection, simulation) with clear before/after value, not vague chat |
| Demo breaks live | Use seeded, deterministic demo data; have a fallback recorded video/screenshots |
| Scope creep | Lock MVP list before Phase 2 starts; stretch features are cut first under time pressure |

---

## 16. Appendix: Example Recalculation Scenario

**Booking:** Jaipur Fort Trek — ₹6,000 total, activity-based split, 4 participants (A, B, C, D) → ₹1,500 each.

**Event:** D drops out before the activity date.

**Recalculation:**
- D removed from BookingParticipants (left_at = event date).
- Remaining cost ₹6,000 ÷ 3 = ₹2,000 each for A, B, C.
- If D already paid ₹1,500, that amount is either refunded to D or converted to a credit against another booking (organizer's choice, configurable).
- Diff shown to A, B, C: "Your share for Jaipur Fort Trek increased from ₹1,500 to ₹2,000 because D left this activity."
- Diff shown to D: "You've been removed from Jaipur Fort Trek. Your ₹1,500 payment is now a credit / refund of ₹1,500."

This scenario alone, demoed live, proves the core value proposition of the entire product.

---

*End of PRD.*