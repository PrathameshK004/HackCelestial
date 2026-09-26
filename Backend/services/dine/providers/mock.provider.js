const { BaseRestaurantProvider } = require('../restaurant.provider');
const { normalizeRestaurantPayload } = require('../../../utils/dine.util');

const createRestaurant = (index, overrides = {}) => ({
  provider: 'fallback',
  providerId: `fallback-${String(index + 1).padStart(3, '0')}`,
  name: 'Sample Restaurant',
  description: 'Curated with fresh local ingredients and a relaxed social dining setup.',
  rating: 4.6,
  review_count: 240,
  price_level: '₹₹',
  phone: '+91 90000 0000',
  website: 'https://example.com',
  address: 'City Centre, India',
  city: 'India',
  state: 'India',
  country: 'India',
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: 'Asia/Kolkata',
  is_group_friendly: true,
  cuisines: ['Indian'],
  opening_hours: [
    { day: 'MON', intervals: [{ open: '12:00', close: '23:00' }] },
    { day: 'TUE', intervals: [{ open: '12:00', close: '23:00' }] },
    { day: 'WED', intervals: [{ open: '12:00', close: '23:00' }] },
    { day: 'THU', intervals: [{ open: '12:00', close: '23:00' }] },
    { day: 'FRI', intervals: [{ open: '12:00', close: '23:30' }] },
    { day: 'SAT', intervals: [{ open: '12:00', close: '23:30' }] },
    { day: 'SUN', intervals: [{ open: '12:00', close: '22:30' }] }
  ],
  photos: [{ url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80' }],
  menu: [
    { name: 'Starters', items: [{ name: 'Chef Special', price: 420, description: 'House favorite starter', isAvailable: true }] },
    { name: 'Mains', items: [{ name: 'Signature Bowl', price: 560, description: 'Fresh, flavorful, and hearty', isAvailable: true }] }
  ],
  offers: [{ title: 'Group Special', description: '10% off for groups of 4+', discount: 10, currency: 'INR' }],
  ...overrides
});

const mockRestaurants = [
  createRestaurant(0, { name: 'The Coastal Kitchen', description: 'Fresh coastal flavors, sunset views, and relaxed dining for travel groups.', rating: 4.6, review_count: 328, price_level: '₹₹', city: 'Candolim', state: 'Goa', latitude: 15.5203, longitude: 73.7628, cuisines: ['Seafood', 'Coastal', 'Goan'] }),
  createRestaurant(1, { name: 'Cedar & Bloom', description: 'Light-filled pasta bar with artisan coffee and polished social energy.', rating: 4.8, review_count: 512, price_level: '₹₹₹', city: 'Baga', state: 'Goa', latitude: 15.5555, longitude: 73.7528, cuisines: ['Italian', 'Cafe'] }),
  createRestaurant(2, { name: 'Saffron Terrace', description: 'North Indian comfort food served in a lively, group-friendly setting.', rating: 4.5, review_count: 241, price_level: '₹₹', city: 'Calangute', state: 'Goa', latitude: 15.5421, longitude: 73.7609, cuisines: ['Indian', 'North Indian'] }),
  createRestaurant(3, { name: 'Jalebi Junction', description: 'A vibrant local favorite serving street-food classics and family platters.', rating: 4.4, review_count: 318, price_level: '₹₹', city: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873, cuisines: ['Street Food', 'North Indian'] }),
  createRestaurant(4, { name: 'Blue Lotus Table', description: 'Refined vegetarian dining with modern plating and all-day brunch.', rating: 4.7, review_count: 402, price_level: '₹₹₹', city: 'Udaipur', state: 'Rajasthan', latitude: 24.5854, longitude: 73.7125, cuisines: ['Vegetarian', 'Contemporary'] }),
  createRestaurant(5, { name: 'Monsoon Grill', description: 'Charcoal-fired grills, signature mocktails, and a roomy setup for groups.', rating: 4.6, review_count: 462, price_level: '₹₹₹', city: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777, cuisines: ['Grill', 'BBQ', 'Continental'] }),
  createRestaurant(6, { name: 'Amber Courtyard', description: 'Heritage-inspired cuisine and open-air seating in the heart of the city.', rating: 4.8, review_count: 563, price_level: '₹₹₹', city: 'Jaipur', state: 'Rajasthan', latitude: 26.9221, longitude: 75.7789, cuisines: ['Rajasthani', 'Fine Dining'] }),
  createRestaurant(7, { name: 'Hilltop Bites', description: 'Mountain-view comfort food with warm service and customizable platters.', rating: 4.3, review_count: 180, price_level: '₹₹', city: 'Manali', state: 'Himachal Pradesh', latitude: 32.2396, longitude: 77.1887, cuisines: ['Indian', 'Chinese'] }),
  createRestaurant(8, { name: 'Sunset Spice House', description: 'Relaxed dinner spot with generous portions and lively local flavors.', rating: 4.5, review_count: 289, price_level: '₹₹', city: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, cuisines: ['Maharashtrian', 'Indian'] }),
  createRestaurant(9, { name: 'Sirocco Kitchen', description: 'Mediterranean-inspired dishes and elegant cocktails for slow evenings.', rating: 4.7, review_count: 430, price_level: '₹₹₹', city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, cuisines: ['Mediterranean', 'European'] }),
  createRestaurant(10, { name: 'Nile Pearl Diner', description: 'Comfort food classics with cheerful service and family-size sharing meals.', rating: 4.4, review_count: 265, price_level: '₹₹', city: 'Kochi', state: 'Kerala', latitude: 9.9312, longitude: 76.2673, cuisines: ['Kerala', 'Seafood'] }),
  createRestaurant(11, { name: 'Lotus Leaf Cafe', description: 'Coffee-forward cafe serving breakfast bowls, sandwiches, and brunch plates.', rating: 4.6, review_count: 351, price_level: '₹₹', city: 'Bengaluru', state: 'Karnataka', latitude: 13.0068, longitude: 77.5545, cuisines: ['Cafe', 'Continental'] }),
  createRestaurant(12, { name: 'Gulmohar Table', description: 'Colourful interiors, rooftop seating, and contemporary Indian menus.', rating: 4.5, review_count: 378, price_level: '₹₹₹', city: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.209, cuisines: ['Indian', 'Fusion'] }),
  createRestaurant(13, { name: 'Tandoor Trail', description: 'Broader platters, smoky kebabs, and cozy seating built for friend groups.', rating: 4.7, review_count: 488, price_level: '₹₹₹', city: 'Agra', state: 'Uttar Pradesh', latitude: 27.1767, longitude: 78.0081, cuisines: ['Mughlai', 'Kebabs'] }),
  createRestaurant(14, { name: 'Driftwood Dining', description: 'Open terraces, tropical cocktails, and breezy waterfront dining.', rating: 4.8, review_count: 540, price_level: '₹₹₹', city: 'Goa', state: 'Goa', latitude: 15.4989, longitude: 73.8278, cuisines: ['Seafood', 'Fusion'] }),
  createRestaurant(15, { name: 'Palm & Pepper', description: 'A relaxed dining room focused on fresh vegetables, seafood, and island flavors.', rating: 4.5, review_count: 307, price_level: '₹₹', city: 'Kovalam', state: 'Kerala', latitude: 8.3969, longitude: 76.9892, cuisines: ['Seafood', 'South Indian'] }),
  createRestaurant(16, { name: 'Heritage Paneer House', description: 'Traditional recipes and a warm, local atmosphere with hearty platters.', rating: 4.4, review_count: 233, price_level: '₹₹', city: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, cuisines: ['Awadhi', 'North Indian'] }),
  createRestaurant(17, { name: 'Citrus Courtyard', description: 'Fresh regional ingredients, spacious seating, and lively brunch service.', rating: 4.6, review_count: 399, price_level: '₹₹₹', city: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867, cuisines: ['Hyderabadi', 'Indian'] }),
  createRestaurant(18, { name: 'Riverlight Deli', description: 'Mini plates, cocktails, and a polished cafe setting for travelers on the move.', rating: 4.6, review_count: 332, price_level: '₹₹', city: 'Varanasi', state: 'Uttar Pradesh', latitude: 25.3176, longitude: 82.9739, cuisines: ['Cafe', 'Global'] }),
  createRestaurant(19, { name: 'The Lantern Table', description: 'Warm lighting, elevated local classics, and a slow dining pace.', rating: 4.7, review_count: 419, price_level: '₹₹₹', city: 'Leh', state: 'Ladakh', latitude: 34.1526, longitude: 77.5771, cuisines: ['Ladakhi', 'Contemporary'] }),
  createRestaurant(20, { name: 'Velvet Terrace', description: 'Premium interiors, chef-led specials, and easy group-friendly planning.', rating: 4.9, review_count: 670, price_level: '₹₹₹₹', city: 'Delhi', state: 'Delhi', latitude: 28.7041, longitude: 77.1025, cuisines: ['Fine Dining', 'Fusion'] })
];

class FallbackRestaurantProvider extends BaseRestaurantProvider {
  constructor() {
    super('fallback');
    this.restaurants = mockRestaurants.map((restaurant) => normalizeRestaurantPayload(restaurant));
  }

  async searchRestaurants(params = {}) {
    const query = String(params.query || '').trim().toLowerCase();
    const cuisine = String(params.cuisine || '').trim().toLowerCase();
    const minRating = Number(params.rating || 0);

    const filtered = this.restaurants.filter((restaurant) => {
      const searchableText = `${restaurant.name} ${restaurant.cuisine.join(' ')} ${restaurant.city}`.toLowerCase();
      const matchesQuery = !query || searchableText.includes(query);
      const matchesCuisine = !cuisine || restaurant.cuisine.some((item) => item.toLowerCase().includes(cuisine));
      const matchesRating = !minRating || Number(restaurant.rating) >= minRating;
      return matchesQuery && matchesCuisine && matchesRating;
    });

    return filtered.slice(0, Number(params.limit) || 20).map((restaurant) => ({
      ...restaurant,
      distanceKm: restaurant.latitude && restaurant.longitude ? Number((Math.random() * 4 + 0.5).toFixed(1)) : null
    }));
  }

  async getRestaurantDetails(restaurantId) {
    return this.restaurants.find((restaurant) => restaurant.id === restaurantId || restaurant.slug === restaurantId || restaurant.providerPlaceId === restaurantId) || null;
  }

  async getRestaurantMenu(restaurantId) {
    const restaurant = await this.getRestaurantDetails(restaurantId);
    return restaurant ? (restaurant.menu || []) : [];
  }

  async getRestaurantPhotos(restaurantId) {
    const restaurant = await this.getRestaurantDetails(restaurantId);
    return restaurant ? (restaurant.photos || []) : [];
  }

  async getRestaurantHours(restaurantId) {
    const restaurant = await this.getRestaurantDetails(restaurantId);
    return restaurant ? (restaurant.hours || []) : [];
  }

  async getRestaurantOffers(restaurantId) {
    const restaurant = await this.getRestaurantDetails(restaurantId);
    return restaurant ? (restaurant.offers || []) : [];
  }
}

function createFallbackProvider() {
  return new FallbackRestaurantProvider();
}

module.exports = {
  FallbackRestaurantProvider,
  createFallbackProvider,
  mockRestaurants
};
