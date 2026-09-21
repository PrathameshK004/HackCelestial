/**
 * Google-Style Profile Illustrations Catalog (MobileApp)
 * Contains the 10 real traveler illustrations generated for user avatars
 */

export interface IllustrationItem {
  id: string;
  name: string;
  category: 'travel' | 'nature' | 'animals' | 'food';
  tags: string[];
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

export const ILLUSTRATION_ASSETS: Record<string, any> = {
  ill_hang_glider: require('../../assets/illustrations/ill_hang_glider.jpg'),
  ill_cap_explorer: require('../../assets/illustrations/ill_cap_explorer.jpg'),
  ill_mountain_cabin: require('../../assets/illustrations/ill_mountain_cabin.jpg'),
  ill_hot_air_balloon: require('../../assets/illustrations/ill_hot_air_balloon.jpg'),
  ill_historic_bridge: require('../../assets/illustrations/ill_historic_bridge.jpg'),
  ill_glacier_cave: require('../../assets/illustrations/ill_glacier_cave.jpg'),
  ill_unicorn_magic: require('../../assets/illustrations/ill_unicorn_magic.jpg'),
  ill_woodpecker_bird: require('../../assets/illustrations/ill_woodpecker_bird.jpg'),
  ill_margarita_drink: require('../../assets/illustrations/ill_margarita_drink.jpg'),
  ill_woodfire_pizza: require('../../assets/illustrations/ill_woodfire_pizza.jpg'),
};

export const ILLUSTRATIONS: IllustrationItem[] = [
  {
    id: 'ill_hang_glider',
    name: 'Hang Glider',
    category: 'travel',
    tags: ['hang glider', 'mountains', 'sky', 'adventure', 'flight', 'flying', 'traveler'],
    bgColors: ['#38BDF8', '#0284C7'],
    accentColor: '#F59E0B',
  },
  {
    id: 'ill_cap_explorer',
    name: 'Cap Explorer',
    category: 'travel',
    tags: ['explorer', 'hiker', 'cap', 'traveler', 'portrait', 'backpacker', 'adventure'],
    bgColors: ['#F97316', '#C2410C'],
    accentColor: '#10B981',
  },
  {
    id: 'ill_mountain_cabin',
    name: 'Hillside Cabin',
    category: 'travel',
    tags: ['cabin', 'mountains', 'lake', 'scenic', 'cottage', 'valley', 'nordic', 'travel'],
    bgColors: ['#4ADE80', '#15803D'],
    accentColor: '#DC2626',
  },
  {
    id: 'ill_hot_air_balloon',
    name: 'Hot Air Balloons',
    category: 'travel',
    tags: ['balloon', 'cappadocia', 'canyon', 'sunrise', 'flight', 'sky', 'traveler'],
    bgColors: ['#FDBA74', '#EA580C'],
    accentColor: '#FBBF24',
  },
  {
    id: 'ill_historic_bridge',
    name: 'Old Stone Bridge',
    category: 'travel',
    tags: ['bridge', 'historic', 'river', 'valley', 'architecture', 'monument', 'travel'],
    bgColors: ['#818CF8', '#3730A3'],
    accentColor: '#10B981',
  },
  {
    id: 'ill_glacier_cave',
    name: 'Glacier Cave',
    category: 'nature',
    tags: ['glacier', 'cave', 'ice', 'arctic', 'frozen', 'blue', 'winter', 'expedition'],
    bgColors: ['#38BDF8', '#1D4ED8'],
    accentColor: '#06B6D4',
  },
  {
    id: 'ill_unicorn_magic',
    name: 'Vibrant Unicorn',
    category: 'animals',
    tags: ['unicorn', 'magic', 'rainbow', 'fantasy', 'mythical', 'dream', 'stars'],
    bgColors: ['#EC4899', '#BE185D'],
    accentColor: '#8B5CF6',
  },
  {
    id: 'ill_woodpecker_bird',
    name: 'Forest Woodpecker',
    category: 'animals',
    tags: ['bird', 'woodpecker', 'branch', 'wildlife', 'forest', 'nature', 'watcher'],
    bgColors: ['#38BDF8', '#0284C7'],
    accentColor: '#EF4444',
  },
  {
    id: 'ill_margarita_drink',
    name: 'Sunset Margarita',
    category: 'food',
    tags: ['margarita', 'cocktail', 'drink', 'lime', 'sunset', 'beach', 'tropical', 'vacation'],
    bgColors: ['#FB7185', '#9333EA'],
    accentColor: '#10B981',
  },
  {
    id: 'ill_woodfire_pizza',
    name: 'Woodfire Pizza',
    category: 'food',
    tags: ['pizza', 'fire', 'oven', 'italian', 'foodie', 'slice', 'crust', 'travel'],
    bgColors: ['#F97316', '#B91C1C'],
    accentColor: '#EAB308',
  },
];

export const getIllustrationById = (id?: string | null): IllustrationItem | undefined => {
  if (!id) return undefined;
  return ILLUSTRATIONS.find((item) => item.id === id);
};

export const getIllustrationAsset = (id?: string | null) => {
  if (!id) return null;
  return ILLUSTRATION_ASSETS[id] || null;
};
