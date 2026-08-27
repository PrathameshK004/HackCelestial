import { DestinationOption, Traveler, TripFormData } from '../types/group';

export const INITIAL_TRAVELERS: Traveler[] = [];

export const INITIAL_MOCK_TRIP: TripFormData = {
  groupName: '',
  destination: '',
  startDate: '',
  endDate: '',
  tripType: 'Friends',
  currency: 'INR',
  expenseSplit: 'equal',
  description: '',
  travelers: INITIAL_TRAVELERS
};

export const MOCK_DESTINATIONS: DestinationOption[] = [
  { city: 'Goa', country: 'India', tag: 'Beaches & Nightlife' },
  { city: 'Manali', country: 'India', tag: 'Mountains & Adventure' },
  { city: 'Bali', country: 'Indonesia', tag: 'Tropical & Culture' },
  { city: 'Tokyo', country: 'Japan', tag: 'City & Tech' },
  { city: 'Dubai', country: 'UAE', tag: 'Luxury & Desert' },
  { city: 'Paris', country: 'France', tag: 'Art & Heritage' },
  { city: 'Ladakh', country: 'India', tag: 'Road Trips & Trekking' }
];

export const CURRENCY_OPTIONS = [
  { code: 'INR', symbol: '₹', label: 'INR — Indian Rupee', subtitle: 'Default for India trips' },
  { code: 'USD', symbol: '$', label: 'USD — US Dollar', subtitle: 'Global standard' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro', subtitle: 'Eurozone destinations' },
  { code: 'GBP', symbol: '£', label: 'GBP — British Pound', subtitle: 'United Kingdom' },
  { code: 'AED', symbol: 'AED', label: 'AED — UAE Dirham', subtitle: 'Middle East trips' }
] as const;

export const EXPENSE_SPLIT_OPTIONS = [
  {
    id: 'equal',
    title: 'Equal Split',
    description: 'Everyone pays equally.',
    badge: 'Popular',
    icon: 'Users'
  },
  {
    id: 'participant',
    title: 'Participant Based',
    description: 'Only selected travelers share the cost.',
    badge: 'Flexible',
    icon: 'UserCheck'
  },
  {
    id: 'organizer',
    title: 'Organizer Paid',
    description: 'Organizer pays initially.',
    badge: 'Simple',
    icon: 'CreditCard'
  },
  {
    id: 'custom',
    title: 'Custom',
    description: 'Define different amounts later.',
    badge: 'Advanced',
    icon: 'Sliders'
  }
] as const;

export const TRIP_TYPES = [
  { id: 'Friends', label: 'Friends', icon: 'Sparkles', desc: 'Social & adventure' },
  { id: 'Family', label: 'Family', icon: 'Heart', desc: 'All generations' },
  { id: 'Corporate', label: 'Corporate', icon: 'Briefcase', desc: 'Offsites & retreats' },
  { id: 'Student', label: 'Student', icon: 'GraduationCap', desc: 'Budget & campus' },
  { id: 'Other', label: 'Other', icon: 'Compass', desc: 'Custom trips' }
] as const;
