/**
 * Google-Style Profile Illustrations Catalog (WebApp)
 * Contains the 10 real traveler illustrations generated for user avatars
 */

export interface IllustrationItem {
  id: string;
  name: string;
  category: 'travel' | 'nature' | 'animals' | 'food';
  tags: string[];
  imageUrl: string;
  bgColors: [string, string];
  accentColor: string;
}

export interface IllustrationCategory {
  id: string;
  name: string;
}

export const ILLUSTRATION_CATEGORIES: IllustrationCategory[] = [
  { id: 'all', name: 'Start exploring' },
  { id: 'travel', name: 'Travel & Adventure' },
  { id: 'nature', name: 'Nature & Landscapes' },
  { id: 'animals', name: 'Animals & Wildlife' },
  { id: 'food', name: 'Food & Drinks' },
];

export const ILLUSTRATIONS: IllustrationItem[] = [
  {
    id: 'ill_hang_glider',
    name: 'Hang Glider',
    category: 'travel',
    tags: ['hang glider', 'mountains', 'sky', 'adventure', 'flight', 'flying', 'traveler'],
    imageUrl: '/illustrations/ill_hang_glider.jpg',
    bgColors: ['#38BDF8', '#0284C7'],
    accentColor: '#F59E0B',
  },
  {
    id: 'ill_cap_explorer',
    name: 'Cap Explorer',
    category: 'travel',
    tags: ['explorer', 'hiker', 'cap', 'traveler', 'portrait', 'backpacker', 'adventure'],
    imageUrl: '/illustrations/ill_cap_explorer.jpg',
    bgColors: ['#F97316', '#C2410C'],
    accentColor: '#10B981',
  },
  {
    id: 'ill_mountain_cabin',
    name: 'Hillside Cabin',
    category: 'travel',
    tags: ['cabin', 'mountains', 'lake', 'scenic', 'cottage', 'valley', 'nordic', 'travel'],
    imageUrl: '/illustrations/ill_mountain_cabin.jpg',
    bgColors: ['#4ADE80', '#15803D'],
    accentColor: '#DC2626',
  },
  {
    id: 'ill_hot_air_balloon',
    name: 'Hot Air Balloons',
    category: 'travel',
    tags: ['balloon', 'cappadocia', 'canyon', 'sunrise', 'flight', 'sky', 'traveler'],
    imageUrl: '/illustrations/ill_hot_air_balloon.jpg',
    bgColors: ['#FDBA74', '#EA580C'],
    accentColor: '#FBBF24',
  },
  {
    id: 'ill_historic_bridge',
    name: 'Old Stone Bridge',
    category: 'travel',
    tags: ['bridge', 'historic', 'river', 'valley', 'architecture', 'monument', 'travel'],
    imageUrl: '/illustrations/ill_historic_bridge.jpg',
    bgColors: ['#818CF8', '#3730A3'],
    accentColor: '#10B981',
  },
  {
    id: 'ill_glacier_cave',
    name: 'Glacier Cave',
    category: 'nature',
    tags: ['glacier', 'cave', 'ice', 'arctic', 'frozen', 'blue', 'winter', 'expedition'],
    imageUrl: '/illustrations/ill_glacier_cave.jpg',
    bgColors: ['#38BDF8', '#1D4ED8'],
    accentColor: '#06B6D4',
  },
  {
    id: 'ill_unicorn_magic',
    name: 'Vibrant Unicorn',
    category: 'animals',
    tags: ['unicorn', 'magic', 'rainbow', 'fantasy', 'mythical', 'dream', 'stars'],
    imageUrl: '/illustrations/ill_unicorn_magic.jpg',
    bgColors: ['#EC4899', '#BE185D'],
    accentColor: '#8B5CF6',
  },
  {
    id: 'ill_woodpecker_bird',
    name: 'Forest Woodpecker',
    category: 'animals',
    tags: ['bird', 'woodpecker', 'branch', 'wildlife', 'forest', 'nature', 'watcher'],
    imageUrl: '/illustrations/ill_woodpecker_bird.jpg',
    bgColors: ['#38BDF8', '#0284C7'],
    accentColor: '#EF4444',
  },
  {
    id: 'ill_margarita_drink',
    name: 'Sunset Margarita',
    category: 'food',
    tags: ['margarita', 'cocktail', 'drink', 'lime', 'sunset', 'beach', 'tropical', 'vacation'],
    imageUrl: '/illustrations/ill_margarita_drink.jpg',
    bgColors: ['#FB7185', '#9333EA'],
    accentColor: '#10B981',
  },
  {
    id: 'ill_woodfire_pizza',
    name: 'Woodfire Pizza',
    category: 'food',
    tags: ['pizza', 'fire', 'oven', 'italian', 'foodie', 'slice', 'crust', 'travel'],
    imageUrl: '/illustrations/ill_woodfire_pizza.jpg',
    bgColors: ['#F97316', '#B91C1C'],
    accentColor: '#EAB308',
  },
];

export const getIllustrationById = (id?: string | null): IllustrationItem | undefined => {
  if (!id) return undefined;
  return ILLUSTRATIONS.find((item) => item.id === id);
};
