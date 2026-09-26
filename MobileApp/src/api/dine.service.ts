import { apiRequest } from './apiClient';

export interface DineRestaurantApiResponse {
  id?: string;
  provider?: string;
  providerPlaceId?: string;
  name?: string;
  slug?: string;
  description?: string;
  status?: string;
  rating?: number | string;
  reviewCount?: number | string;
  priceLevel?: string;
  phone?: string;
  website?: string;
  primaryImage?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number | string;
  longitude?: number | string;
  timezone?: string;
  groupFriendly?: boolean;
  isActive?: boolean;
  cuisine?: string[];
  photos?: Array<{ url?: string; imageUrl?: string; isPrimary?: boolean; caption?: string }>;
  hours?: Array<any>;
  offers?: Array<any>;
  menu?: any[];
  distance?: string | number;
  openUntil?: string;
  tags?: string[];
}

const unwrapResponseData = <T>(payload: any): T => {
  if (!payload || typeof payload !== 'object') return payload;

  const unwrapNestedValue = (value: any): any => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return value;

    if (Array.isArray(value.value)) return value.value;
    if (typeof value.value === 'string') {
      try {
        const parsed = JSON.parse(value.value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Ignore invalid JSON and fall through.
      }
    }

    if (Array.isArray(value.data)) return value.data;
    if (value.data && typeof value.data === 'object') {
      return unwrapNestedValue(value.data);
    }

    return value;
  };

  if (Array.isArray(payload.data)) return payload.data as T;
  if (Array.isArray(payload.items)) return payload.items as T;
  if (payload.data && typeof payload.data === 'object') {
    const nested = unwrapNestedValue(payload.data);
    if (Array.isArray(nested)) return nested as T;
    if (nested && typeof nested === 'object') {
      if ('restaurant' in nested) return nested.restaurant as T;
      if ('favorites' in nested) return nested.favorites as T;
      if ('menu' in nested) return nested.menu as T;
      if ('photos' in nested) return nested.photos as T;
      if ('offers' in nested) return nested.offers as T;
      if ('hours' in nested) return nested.hours as T;
      if ('activity' in nested) return nested.activity as T;
      if (Array.isArray(nested.data)) return nested.data as T;
      if (nested.data && typeof nested.data === 'object') return unwrapNestedValue(nested.data) as T;
      if (nested.value !== undefined) return unwrapNestedValue(nested.value) as T;
    }
  }

  const directNested = unwrapNestedValue(payload);
  if (Array.isArray(directNested)) return directNested as T;
  if (directNested && typeof directNested === 'object') {
    if ('restaurant' in directNested) return directNested.restaurant as T;
    if ('favorites' in directNested) return directNested.favorites as T;
    if ('menu' in directNested) return directNested.menu as T;
    if ('photos' in directNested) return directNested.photos as T;
    if ('offers' in directNested) return directNested.offers as T;
    if ('hours' in directNested) return directNested.hours as T;
    if ('activity' in directNested) return directNested.activity as T;
    if (Array.isArray(directNested.data)) return directNested.data as T;
    if (directNested.data && typeof directNested.data === 'object') return unwrapNestedValue(directNested.data) as T;
  }

  return payload as T;
};

export const mapPriceLevelToUi = (priceLevel?: string): '₹' | '₹₹' | '₹₹₹' | '₹₹₹₹' => {
  const normalized = String(priceLevel || '₹₹').trim();
  if (normalized === '₹' || normalized === 'INR') return '₹';
  if (normalized === '₹₹₹') return '₹₹₹';
  if (normalized === '₹₹₹₹' || normalized === '$$$$') return '₹₹₹₹';
  return '₹₹';
};

const buildRestaurantFallbackId = (payload: any): string => {
  const seed = [
    payload?.provider || 'fallback',
    payload?.providerPlaceId || payload?.slug || payload?.name || 'restaurant',
    payload?.name || 'restaurant',
    payload?.address || '',
    payload?.city || '',
    payload?.latitude ?? '',
    payload?.longitude ?? '',
  ].filter(Boolean).join('|');

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return `restaurant-${hash.toString(36)}`;
};

export const mapServerRestaurantToAppRestaurant = (restaurant: any): any => {
  const payload = restaurant?.restaurant ?? restaurant?.data?.restaurant ?? restaurant?.data ?? restaurant ?? {};
  const cuisine = Array.isArray(payload.cuisine)
    ? payload.cuisine
    : Array.isArray(payload.cuisines)
      ? payload.cuisines
      : [];

  const image =
    payload.primaryImage ||
    payload.primary_image ||
    payload.image ||
    payload.photos?.[0]?.url ||
    payload.photos?.[0]?.imageUrl ||
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80';

  const status = String(payload.status || 'OPEN').toUpperCase();
  const priceRange = mapPriceLevelToUi(payload.priceLevel || payload.price_level);
  const fallbackId = buildRestaurantFallbackId(payload);

  return {
    id: payload.id || payload.restaurantId || payload.slug || payload.providerPlaceId || fallbackId,
    name: payload.name || 'Unnamed Restaurant',
    rating: Number(payload.rating || 0),
    reviewCount: Number(payload.reviewCount || payload.review_count || 0),
    cuisine: cuisine.length ? cuisine : ['Restaurant'],
    priceRange,
    distance: payload.distance ? String(payload.distance) : 'Nearby',
    address: payload.address || 'Address unavailable',
    status: status === 'CLOSED' ? 'CLOSED' : 'OPEN',
    image,
    heroImage: image,
    latitude: Number(payload.latitude || 0),
    longitude: Number(payload.longitude || 0),
    groupFriendly: Boolean(payload.groupFriendly ?? payload.is_group_friendly ?? true),
    offer: payload.offer || payload.offers?.[0]?.title || undefined,
    phone: payload.phone || '',
    openUntil: payload.openUntil || 'See opening hours',
    timezone: payload.timezone || 'Asia/Kolkata',
    hours: Array.isArray(payload.hours) ? payload.hours : [],
    description: payload.description || 'A restaurant for your group trip.',
    tags: payload.tags || cuisine || ['Group Dining'],
    menu: Array.isArray(payload.menu) ? normalizeMenu(payload.menu) : [],
  };
};

const normalizeMenu = (menu: any[]): any[] => {
  if (!Array.isArray(menu)) return [];

  return menu.map((group: any, index: number) => {
    const items = Array.isArray(group.items) ? group.items : [];
    return {
      category: group.category || group.name || `Category ${index + 1}`,
      items: items.map((item: any, itemIndex: number) => ({
        id: item.id || `${group.category || 'menu'}-${itemIndex}`,
        name: item.name || 'Menu item',
        description: item.description || 'Freshly prepared',
        price: Number(item.price || item.amount || 0),
        category: item.category || group.category || 'General',
        veg: Boolean(item.veg ?? item.isVegetarian ?? false),
        available: Boolean(item.available ?? item.isAvailable ?? true),
        image: item.image || item.imageUrl || undefined,
      })),
    };
  });
};

export const dineService = {
  async getNearbyRestaurants(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
    cuisine?: string;
    priceLevel?: string;
    openNow?: boolean;
    groupFriendly?: boolean;
  } = { latitude: 15.495, longitude: 73.827 }) {
    const query = new URLSearchParams();
    query.set('latitude', String(params.latitude));
    query.set('longitude', String(params.longitude));
    if (params.radius) query.set('radius', String(params.radius));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.cuisine) query.set('cuisine', params.cuisine);
    if (params.priceLevel) query.set('priceLevel', params.priceLevel);
    if (params.openNow !== undefined) query.set('openNow', String(params.openNow));
    if (params.groupFriendly !== undefined) query.set('groupFriendly', String(params.groupFriendly));

    const res = await apiRequest<any>(`/dine/restaurants/nearby?${query.toString()}`, {
      method: 'GET',
    });

    const list = unwrapResponseData<any[]>(res);
    return Array.isArray(list) ? list : [];
  },

  async searchRestaurants(params: {
    q?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    cuisine?: string;
    priceLevel?: string;
    rating?: number;
    openNow?: boolean;
    groupFriendly?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.latitude !== undefined) query.set('latitude', String(params.latitude));
    if (params.longitude !== undefined) query.set('longitude', String(params.longitude));
    if (params.radius) query.set('radius', String(params.radius));
    if (params.cuisine) query.set('cuisine', params.cuisine);
    if (params.priceLevel) query.set('priceLevel', params.priceLevel);
    if (params.rating) query.set('rating', String(params.rating));
    if (params.openNow !== undefined) query.set('openNow', String(params.openNow));
    if (params.groupFriendly !== undefined) query.set('groupFriendly', String(params.groupFriendly));
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const res = await apiRequest<any>(`/dine/restaurants/search?${query.toString()}`, {
      method: 'GET',
    });

    const list = unwrapResponseData<any[]>(res);
    return Array.isArray(list) ? list : [];
  },

  async getRestaurantById(restaurantId: string) {
    const res = await apiRequest<any>(`/dine/restaurants/${restaurantId}`, {
      method: 'GET',
    });
    return unwrapResponseData(res) ?? null;
  },

  async getRestaurantMenu(restaurantId: string) {
    const res = await apiRequest<any>(`/dine/restaurants/${restaurantId}/menu`, {
      method: 'GET',
    });
    const menu = unwrapResponseData<any[]>(res) ?? [];
    return normalizeMenu(Array.isArray(menu) ? menu : []);
  },

  async getRestaurantPhotos(restaurantId: string) {
    const res = await apiRequest<any>(`/dine/restaurants/${restaurantId}/photos`, {
      method: 'GET',
    });
    return unwrapResponseData<any[]>(res) ?? [];
  },

  async getRestaurantOffers(restaurantId: string) {
    const res = await apiRequest<any>(`/dine/restaurants/${restaurantId}/offers`, {
      method: 'GET',
    });
    return unwrapResponseData<any[]>(res) ?? [];
  },

  async getRestaurantHours(restaurantId: string) {
    const res = await apiRequest<any>(`/dine/restaurants/${restaurantId}/hours`, {
      method: 'GET',
    });
    return unwrapResponseData<any[]>(res) ?? [];
  },

  async getRestaurantAvailability(restaurantId: string, date: string) {
    const res = await apiRequest<any>(`/dine/restaurants/${encodeURIComponent(restaurantId)}/availability?date=${encodeURIComponent(date)}`, {
      method: 'GET',
    });
    return res?.data?.availability || res?.availability || null;
  },

  async getFavoriteRestaurants() {
    const res = await apiRequest<any>(`/dine/restaurants/favorites`, { method: 'GET' });
    const favorites = unwrapResponseData<any[]>(res);
    return Array.isArray(favorites) ? favorites : [];
  },

  async toggleFavorite(restaurantId: string) {
    const res = await apiRequest<any>(`/dine/restaurants/${restaurantId}/favorite`, {
      method: 'POST',
    });
    return unwrapResponseData<any>(res) ?? { favorited: true };
  },

  async removeFavorite(restaurantId: string) {
    const res = await apiRequest<any>(`/dine/restaurants/${restaurantId}/favorite`, {
      method: 'DELETE',
    });
    return unwrapResponseData<any>(res) ?? { favorited: false };
  },

  async createDiningActivity(tripId: string, payload: {
    restaurantId: string;
    date: string;
    startTime?: string;
    endTime?: string;
    participants?: string[];
    estimatedBudget?: number;
    currency?: string;
    notes?: string;
  }) {
    const res = await apiRequest<any>(`/trips/${tripId}/dining`, {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: payload.restaurantId,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        participants: payload.participants || [],
        estimatedBudget: payload.estimatedBudget,
        currency: payload.currency || 'INR',
        notes: payload.notes || '',
      }),
    });
    return unwrapResponseData<any>(res) ?? null;
  },

  async createRestaurantReservation(restaurantId: string, tripId: string, payload: {
    date: string;
    startTime: string;
    participants: string[];
    guestCount: number;
    estimatedBudget?: number;
    currency?: string;
    notes?: string;
  }) {
    const res = await apiRequest<any>(`/dine/restaurants/${encodeURIComponent(restaurantId)}/reservations`, {
      method: 'POST',
      body: JSON.stringify({
        groupId: tripId,
        date: payload.date,
        startTime: payload.startTime,
        participants: payload.participants,
        guestCount: payload.guestCount,
        estimatedBudget: payload.estimatedBudget,
        currency: payload.currency || 'INR',
        notes: payload.notes || '',
      }),
    });
    return unwrapResponseData<any>(res) ?? null;
  },
};
