export type DineLocationMode = 'near-me' | 'near-trip';
export type DinePriceRange = '₹' | '₹₹' | '₹₹₹' | '₹₹₹₹';
export type RestaurantStatus = 'OPEN' | 'CLOSED';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  veg?: boolean;
  available: boolean;
  image?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  cuisine: string[];
  priceRange: DinePriceRange;
  distance: string;
  address: string;
  status: RestaurantStatus;
  image: string;
  heroImage: string;
  latitude: number;
  longitude: number;
  groupFriendly: boolean;
  offer?: string;
  phone: string;
  openUntil: string;
  description: string;
  tags: string[];
  menu: {
    category: string;
    items: MenuItem[];
  }[];
}

export const dineRestaurants: Restaurant[] = [
  {
    id: 'restaurant-001',
    name: 'The Coastal Kitchen',
    rating: 4.6,
    reviewCount: 328,
    cuisine: ['Seafood', 'Coastal'],
    priceRange: '₹₹',
    distance: '1.2 km',
    address: 'Candolim, Goa',
    status: 'OPEN',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.5203,
    longitude: 73.7628,
    groupFriendly: true,
    offer: 'Group Special',
    phone: '+91 80000 12345',
    openUntil: '11:00 PM',
    description: 'Fresh coastal flavors, sunset views, and a relaxed dining setup tailored for travel groups.',
    tags: ['Sunset Dining', 'Seafood', 'Travelers'],
    menu: [
      {
        category: 'Starters',
        items: [
          { id: 's1', name: 'Butter Garlic Prawns', description: 'Fresh prawns with garlic butter and herbs', price: 420, category: 'Starters', veg: false, available: true },
          { id: 's2', name: 'Crispy Calamari', description: 'Lightly fried with lemon aioli', price: 310, category: 'Starters', veg: false, available: true },
          { id: 's3', name: 'Goan Veg Platter', description: 'Local vegetables with spicy chutneys', price: 280, category: 'Starters', veg: true, available: true },
        ],
      },
      {
        category: 'Mains',
        items: [
          { id: 'm1', name: 'Prawn Curry Rice', description: 'Traditional Goan curry served with rice', price: 540, category: 'Mains', veg: false, available: true },
          { id: 'm2', name: 'Herb Chicken Grill', description: 'Marinated chicken with grilled vegetables', price: 480, category: 'Mains', veg: false, available: true },
          { id: 'm3', name: 'Paneer Tikka Bowl', description: 'Smoky paneer served with saffron rice', price: 390, category: 'Mains', veg: true, available: true },
        ],
      },
      {
        category: 'Beverages',
        items: [
          { id: 'b1', name: 'Coconut Cooler', description: 'Local coconut and lime blend', price: 180, category: 'Beverages', veg: true, available: true },
          { id: 'b2', name: 'Fresh Lime Soda', description: 'Chilled and sparkling', price: 110, category: 'Beverages', veg: true, available: true },
        ],
      },
    ],
  },
  {
    id: 'restaurant-002',
    name: 'Cedar & Bloom',
    rating: 4.8,
    reviewCount: 512,
    cuisine: ['Italian', 'Cafe'],
    priceRange: '₹₹₹',
    distance: '2.4 km',
    address: 'Baga, Goa',
    status: 'OPEN',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.5555,
    longitude: 73.7528,
    groupFriendly: true,
    offer: 'Chef’s Table',
    phone: '+91 90000 23456',
    openUntil: '10:30 PM',
    description: 'A light-filled dining spot serving handmade pasta and artisan coffee in a polished, social atmosphere.',
    tags: ['Italian', 'Coffee', 'Sunlit'],
    menu: [
      {
        category: 'Starters',
        items: [
          { id: 'c1', name: 'Truffle Bruschetta', description: 'Toasted sourdough with tomato and truffle', price: 350, category: 'Starters', veg: true, available: true },
          { id: 'c2', name: 'Ricotta Crostini', description: 'Creamy ricotta with citrus zest', price: 330, category: 'Starters', veg: true, available: true },
        ],
      },
      {
        category: 'Mains',
        items: [
          { id: 'c3', name: 'Wild Mushroom Pasta', description: 'Creamy parmesan and herb sauce', price: 620, category: 'Mains', veg: true, available: true },
          { id: 'c4', name: 'Lemon Herb Chicken', description: 'Chargrilled with grilled greens', price: 690, category: 'Mains', veg: false, available: true },
        ],
      },
      {
        category: 'Desserts',
        items: [
          { id: 'c5', name: 'Tiramisu', description: 'Classic espresso mascarpone dessert', price: 260, category: 'Desserts', veg: true, available: true },
        ],
      },
    ],
  },
  {
    id: 'restaurant-003',
    name: 'Saffron Terrace',
    rating: 4.5,
    reviewCount: 241,
    cuisine: ['Indian', 'North Indian'],
    priceRange: '₹₹',
    distance: '0.9 km',
    address: 'Calangute, Goa',
    status: 'OPEN',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.5421,
    longitude: 73.7609,
    groupFriendly: true,
    offer: 'Family Feast',
    phone: '+91 70000 99887',
    openUntil: '11:30 PM',
    description: 'Comforting North Indian favorites with elevated plating and a lively group-friendly atmosphere.',
    tags: ['North Indian', 'Family', 'Comfort Food'],
    menu: [
      {
        category: 'Starters',
        items: [
          { id: 't1', name: 'Paneer Tikka', description: 'Char-grilled cottage cheese with spices', price: 360, category: 'Starters', veg: true, available: true },
          { id: 't2', name: 'Chicken Lollipop', description: 'Crispy and juicy with house dip', price: 410, category: 'Starters', veg: false, available: true },
        ],
      },
      {
        category: 'Mains',
        items: [
          { id: 't3', name: 'Dal Makhani', description: 'Slow-cooked black lentils and cream', price: 420, category: 'Mains', veg: true, available: true },
          { id: 't4', name: 'Butter Chicken', description: 'Rich tomato gravy, indulgent and classic', price: 560, category: 'Mains', veg: false, available: true },
        ],
      },
      {
        category: 'Desserts',
        items: [
          { id: 't5', name: 'Gulab Jamun', description: 'Warm saffron syrup soft dessert', price: 180, category: 'Desserts', veg: true, available: true },
        ],
      },
    ],
  },
  {
    id: 'restaurant-004',
    name: 'Horizon Grill',
    rating: 4.3,
    reviewCount: 188,
    cuisine: ['Continental', 'BBQ'],
    priceRange: '₹₹₹',
    distance: '3.1 km',
    address: 'Anjuna, Goa',
    status: 'CLOSED',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.572,
    longitude: 73.7417,
    groupFriendly: false,
    phone: '+91 62000 11223',
    openUntil: '10:00 PM',
    description: 'A grill-focused dining experience with open-air seating and generous platters for groups.',
    tags: ['BBQ', 'Outdoor', 'Late Night'],
    menu: [
      {
        category: 'Mains',
        items: [
          { id: 'h1', name: 'Smoky BBQ Platter', description: 'Mixed grilled meats and sauces', price: 980, category: 'Mains', veg: false, available: false },
          { id: 'h2', name: 'Herb Grilled Veg', description: 'Seasonal vegetables with chimichurri', price: 490, category: 'Mains', veg: true, available: false },
        ],
      },
    ],
  },
  {
    id: 'restaurant-005',
    name: 'Riverfront Cafe',
    rating: 4.7,
    reviewCount: 446,
    cuisine: ['Cafe', 'Healthy'],
    priceRange: '₹₹',
    distance: '1.8 km',
    address: 'Assagao, Goa',
    status: 'OPEN',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.5932,
    longitude: 73.7358,
    groupFriendly: true,
    offer: 'Brunch Offer',
    phone: '+91 72000 33445',
    openUntil: '9:30 PM',
    description: 'A vibrant cafe serving brunch plates, smoothies, and leisurely lunches inspired by local produce.',
    tags: ['Cafe', 'Brunch', 'Healthy'],
    menu: [
      {
        category: 'Starters',
        items: [
          { id: 'r1', name: 'Avocado Toast', description: 'Sourdough with avocado and chili crunch', price: 260, category: 'Starters', veg: true, available: true },
        ],
      },
      {
        category: 'Beverages',
        items: [
          { id: 'r2', name: 'Cold Brew', description: 'Slow-steeped and smooth', price: 190, category: 'Beverages', veg: true, available: true },
          { id: 'r3', name: 'Mango Smoothie', description: 'Fresh mango and yogurt blend', price: 210, category: 'Beverages', veg: true, available: true },
        ],
      },
    ],
  },
  {
    id: 'restaurant-006',
    name: 'Mango & Mint',
    rating: 4.4,
    reviewCount: 209,
    cuisine: ['Indian', 'Fusion'],
    priceRange: '₹₹',
    distance: '2.9 km',
    address: 'Mapusa, Goa',
    status: 'OPEN',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.5939,
    longitude: 73.8137,
    groupFriendly: true,
    phone: '+91 82000 44556',
    openUntil: '10:45 PM',
    description: 'Local flavors with a modern twist, created for energetic groups and long evenings out.',
    tags: ['Fusion', 'Local Favorite', 'Group Dining'],
    menu: [
      {
        category: 'Starters',
        items: [
          { id: 'm1', name: 'Mango Chaat', description: 'Sweet and spicy seasonal bites', price: 240, category: 'Starters', veg: true, available: true },
        ],
      },
      {
        category: 'Mains',
        items: [
          { id: 'm2', name: 'Coconut Curry Bowl', description: 'Rich coconut curry and vegetables', price: 430, category: 'Mains', veg: true, available: true },
          { id: 'm3', name: 'Mango Chicken Skewers', description: 'Sweet chili glaze and charred herbs', price: 520, category: 'Mains', veg: false, available: true },
        ],
      },
    ],
  },
  {
    id: 'restaurant-007',
    name: 'Velvet Palm',
    rating: 4.9,
    reviewCount: 621,
    cuisine: ['Fine Dining', 'Seafood'],
    priceRange: '₹₹₹₹',
    distance: '4.2 km',
    address: 'Morjim, Goa',
    status: 'OPEN',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.6189,
    longitude: 73.7445,
    groupFriendly: false,
    offer: 'Chef’s Selection',
    phone: '+91 94000 77221',
    openUntil: '11:30 PM',
    description: 'Contemporary coastal dining with elevated plating, curated pairings, and a premium ambiance.',
    tags: ['Premium', 'Seafood', 'Luxury'],
    menu: [
      {
        category: 'Seafood',
        items: [
          { id: 'v1', name: 'Saffron Sea Bass', description: 'Pan-seared sea bass with lemon beurre blanc', price: 860, category: 'Seafood', veg: false, available: true },
          { id: 'v2', name: 'Tiger Prawn Tempura', description: 'Crisp and delicate with chili dip', price: 780, category: 'Seafood', veg: false, available: true },
        ],
      },
      {
        category: 'Desserts',
        items: [
          { id: 'v3', name: 'Coconut Panna Cotta', description: 'Tender panna cotta with tropical fruit', price: 340, category: 'Desserts', veg: true, available: true },
        ],
      },
    ],
  },
  {
    id: 'restaurant-008',
    name: 'The Lantern Table',
    rating: 4.2,
    reviewCount: 173,
    cuisine: ['Chinese', 'Thai'],
    priceRange: '₹₹',
    distance: '1.5 km',
    address: 'Panaji, Goa',
    status: 'OPEN',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.496,
    longitude: 73.8225,
    groupFriendly: true,
    offer: 'Late Night Noodles',
    phone: '+91 75000 88991',
    openUntil: '12:00 AM',
    description: 'Warming noodle bowls, wok classics, and an easygoing setting for larger evening groups.',
    tags: ['Chinese', 'Thai', 'Late Night'],
    menu: [
      {
        category: 'Starters',
        items: [
          { id: 'l1', name: 'Crispy Corn Bao', description: 'Sweet corn buns with chili glaze', price: 280, category: 'Starters', veg: true, available: true },
        ],
      },
      {
        category: 'Mains',
        items: [
          { id: 'l2', name: 'Thai Basil Noodles', description: 'Wok-tossed noodles and vegetables', price: 420, category: 'Mains', veg: true, available: true },
          { id: 'l3', name: 'Chili Garlic Chicken', description: 'Wok-fried chicken with peppers', price: 470, category: 'Mains', veg: false, available: true },
        ],
      },
    ],
  },
  {
    id: 'restaurant-009',
    name: 'Breeze & Bar',
    rating: 4.1,
    reviewCount: 154,
    cuisine: ['Drinks', 'Snacks'],
    priceRange: '₹₹',
    distance: '3.5 km',
    address: 'Siolim, Goa',
    status: 'CLOSED',
    image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.5814,
    longitude: 73.8014,
    groupFriendly: true,
    phone: '+91 88000 77990',
    openUntil: '10:00 PM',
    description: 'Casual cocktails, sharables, and an easygoing evening vibe made for quick catch-ups.',
    tags: ['Cocktails', 'Shisha', 'Evenings'],
    menu: [
      {
        category: 'Snacks',
        items: [
          { id: 'b01', name: 'Loaded Nachos', description: 'House cheese sauce and salsa', price: 320, category: 'Snacks', veg: true, available: false },
        ],
      },
      {
        category: 'Beverages',
        items: [
          { id: 'b02', name: 'Mojito', description: 'Fresh mint and lime', price: 220, category: 'Beverages', veg: true, available: false },
        ],
      },
    ],
  },
  {
    id: 'restaurant-010',
    name: 'Sunset Curries',
    rating: 4.6,
    reviewCount: 387,
    cuisine: ['Indian', 'Seafood'],
    priceRange: '₹₹₹',
    distance: '2.1 km',
    address: 'Arpora, Goa',
    status: 'OPEN',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    heroImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    latitude: 15.5754,
    longitude: 73.7708,
    groupFriendly: true,
    offer: 'Sunset Bundle',
    phone: '+91 81000 66433',
    openUntil: '11:00 PM',
    description: 'Warm seafood curries and vibrant coastal plates served in a lively open-air setting.',
    tags: ['Seafood', 'Sunset', 'Group Pick'],
    menu: [
      {
        category: 'Seafood',
        items: [
          { id: 'sc1', name: 'Goan Fish Curry', description: 'Tangy, coconut-rich coastal curry', price: 510, category: 'Seafood', veg: false, available: true },
          { id: 'sc2', name: 'Prawn Masala', description: 'Rich masala with peppers and onion', price: 620, category: 'Seafood', veg: false, available: true },
        ],
      },
      {
        category: 'Mains',
        items: [
          { id: 'sc3', name: 'Jeera Rice', description: 'Fragrant rice with cumin', price: 180, category: 'Mains', veg: true, available: true },
        ],
      },
    ],
  },
];

export const dineLocationOptions = [
  { id: 'near-me', label: 'Near Me', sublabel: 'Mumbai, India' },
  { id: 'near-trip', label: 'Near My Trip', sublabel: 'Goa, India' },
];

export const dineFilterGroups = {
  cuisines: ['Indian', 'Chinese', 'Italian', 'Seafood', 'Cafe', 'Fast Food', 'Local'],
  prices: ['₹', '₹₹', '₹₹₹', '₹₹₹₹'],
  ratings: ['4+', '4.5+'],
  distances: ['<1 km', '<3 km', '<5 km'],
};

export const dineMockTripOptions = [
  { id: 'trip-1', name: 'My Goa Trip', dateRange: '12 Oct – 16 Oct', members: 6 },
  { id: 'trip-2', name: 'North India Escape', dateRange: '21 Nov – 27 Nov', members: 4 },
];
