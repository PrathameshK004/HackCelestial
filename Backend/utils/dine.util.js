const crypto = require('crypto');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `restaurant-${crypto.randomUUID()}`;
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePriceLevel(value) {
  const raw = String(value || '').replace(/\s+/g, '').toUpperCase();
  if (['₹₹₹₹', 'LUXURY', 'HIGH'].includes(raw)) return '₹₹₹₹';
  if (['₹₹₹', 'EXPENSIVE', 'PREMIUM'].includes(raw)) return '₹₹₹';
  if (['₹₹', 'MODERATE', 'MID', 'INR2'].includes(raw)) return '₹₹';
  if (['₹', 'INR', 'CHEAP', 'LOW'].includes(raw)) return '₹';
  if (raw === '₹₹₹') return '₹₹₹';
  if (raw === '₹₹') return '₹₹';
  return raw || '₹₹';
}

function coerceArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [value];
}

function normalizeHours(rawHours = []) {
  const items = Array.isArray(rawHours) ? rawHours : coerceArray(rawHours);
  if (!items.length) return [];

  return items.map((entry) => {
    const day = entry.day || entry.dayOfWeek || entry.label || '';
    const intervals = Array.isArray(entry.intervals)
      ? entry.intervals.map((segment) => ({
          open: segment.open || segment.start || null,
          close: segment.close || segment.end || null
        })).filter((segment) => segment.open || segment.close)
      : [];

    if (!intervals.length && entry.open && entry.close) {
      intervals.push({ open: entry.open, close: entry.close });
    }

    return {
      day: String(day).toUpperCase(),
      intervals,
      isClosed: Boolean(entry.isClosed || entry.closed)
    };
  });
}

function normalizePhotos(rawPhotos = []) {
  const list = Array.isArray(rawPhotos) ? rawPhotos : [];
  return list.map((photo) => {
    if (typeof photo === 'string') {
      return { url: photo, isPrimary: false };
    }
    return {
      url: photo.url || photo.image || null,
      isPrimary: Boolean(photo.isPrimary || photo.primary),
      caption: photo.caption || null
    };
  }).filter((photo) => !!photo.url);
}

function normalizeMenu(rawMenu = []) {
  const items = Array.isArray(rawMenu) ? rawMenu : [];
  return items.map((category) => ({
    id: category.id || slugify(category.name || 'category'),
    name: category.name || 'General',
    description: category.description || '',
    sortOrder: Number(category.sortOrder || category.sort_order || 0),
    items: Array.isArray(category.items) ? category.items.map((item) => ({
      id: item.id || slugify(item.name || 'item'),
      name: item.name || 'Unnamed Item',
      description: item.description || '',
      price: Number(item.price || 0),
      currency: item.currency || 'INR',
      image: item.image || item.photo || null,
      isVegetarian: Boolean(item.isVegetarian ?? item.veg ?? false),
      isVegan: Boolean(item.isVegan ?? false),
      isAvailable: item.isAvailable !== undefined ? Boolean(item.isAvailable) : true,
      dietaryTags: coerceArray(item.dietaryTags || item.dietary_tags || item.tags),
      sortOrder: Number(item.sortOrder || item.sort_order || 0)
    })) : []
  }));
}

function normalizeRestaurantPayload(raw = {}) {
  const cuisines = coerceArray(raw.cuisine || raw.cuisines || raw.categories || raw.tags || []);
  const hours = normalizeHours(raw.hours || raw.opening_hours || raw.hoursByDay || raw.openHours || []);
  const photos = normalizePhotos(raw.photos || raw.images || raw.gallery || []);
  const menu = normalizeMenu(raw.menu || raw.categories || []);
  const offers = Array.isArray(raw.offers) ? raw.offers.map((offer) => ({
    id: offer.id || slugify(offer.title || 'offer'),
    title: offer.title || 'Offer',
    description: offer.description || '',
    discountType: offer.discountType || offer.discount_type || 'PERCENTAGE',
    discount: Number(offer.discount || offer.value || 0),
    currency: offer.currency || 'INR',
    validUntil: offer.validUntil || offer.valid_until || null
  })) : [];

  const providerName = raw.provider || 'fallback';
  const providerPlaceId = raw.providerPlaceId || raw.provider_place_id || raw.providerId || raw.provider_id || raw.externalId || raw.external_id || null;
  const name = raw.name || 'Unnamed Restaurant';

  return {
    id: isUuid(raw.id) ? raw.id : crypto.randomUUID(),
    provider: providerName,
    providerPlaceId,
    name,
    slug: raw.slug || slugify(name),
    description: raw.description || raw.summary || '',
    status: raw.status || 'OPEN',
    rating: Number(raw.rating || raw.reviewRating || 0),
    reviewCount: Number(raw.reviewCount || raw.review_count || 0),
    priceLevel: normalizePriceLevel(raw.priceLevel || raw.price_level || raw.priceRange || raw.price_range || '₹₹'),
    phone: raw.phone || raw.contact || null,
    website: raw.website || raw.url || null,
    primaryImage: raw.primaryImage || raw.image || raw.heroImage || photos[0]?.url || null,
    address: raw.address || raw.formatted_address || raw.location?.address || '',
    city: raw.city || raw.location?.city || raw.area || '',
    state: raw.state || raw.location?.state || '',
    country: raw.country || raw.location?.country || 'India',
    postalCode: raw.postalCode || raw.postal_code || null,
    latitude: Number(raw.latitude ?? raw.location?.latitude ?? 0),
    longitude: Number(raw.longitude ?? raw.location?.longitude ?? 0),
    timezone: raw.timezone || 'Asia/Kolkata',
    groupFriendly: Boolean(raw.groupFriendly ?? raw.isGroupFriendly ?? raw.is_group_friendly ?? true),
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    cuisine: cuisines,
    hours,
    photos,
    menu,
    offers,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    providerUpdatedAt: raw.providerUpdatedAt || raw.provider_updated_at || null
  };
}

function dedupeRestaurants(restaurants = []) {
  const seen = new Map();
  for (const restaurant of restaurants) {
    const key = restaurant.providerPlaceId
      ? `${restaurant.provider}:${restaurant.providerPlaceId}`
      : `${restaurant.provider}:${slugify(restaurant.name)}:${String(restaurant.latitude || '')}:${String(restaurant.longitude || '')}`;

    if (!seen.has(key)) {
      seen.set(key, restaurant);
    }
  }
  return Array.from(seen.values());
}

function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;

  return undefined;
}

function createHash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function buildRestaurantSearchCacheKey({ query = '', latitude, longitude, radius = 5000, cuisine = '', priceLevel = '', rating = '', openNow = false, groupFriendly = false, sort = 'relevance', page = 1, limit = 20 }) {
  const normalized = {
    query: String(query || '').trim().toLowerCase(),
    latitude: Number(latitude || 0),
    longitude: Number(longitude || 0),
    radius: Number(radius || 5000),
    cuisine: String(cuisine || '').trim().toLowerCase(),
    priceLevel: String(priceLevel || '').trim().toLowerCase(),
    rating: String(rating || '').trim().toLowerCase(),
    openNow: Boolean(openNow),
    groupFriendly: Boolean(groupFriendly),
    sort: String(sort || 'relevance').trim().toLowerCase(),
    page: Number(page || 1),
    limit: Number(limit || 20)
  };
  return `dine:search:${createHash(JSON.stringify(normalized))}`;
}

function buildNearbyQueryKey({ latitude, longitude, radius = 5000, cuisine = '', priceLevel = '', openNow = false, groupFriendly = false }) {
  const normalized = {
    latitude: Number(latitude || 0),
    longitude: Number(longitude || 0),
    radius: Number(radius || 5000),
    cuisine: String(cuisine || '').trim().toLowerCase(),
    priceLevel: String(priceLevel || '').trim().toLowerCase(),
    openNow: Boolean(openNow),
    groupFriendly: Boolean(groupFriendly)
  };
  return `dine:nearby:${createHash(JSON.stringify(normalized))}`;
}

function getDayKey(date = new Date()) {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short' }).format(date).toUpperCase();
  return day;
}

function getTimeZoneParts(date = new Date(), timezone = 'Asia/Kolkata') {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short'
  });
  const parts = fmt.formatToParts(date);
  const lookup = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      lookup[part.type] = part.value;
    }
  }
  return {
    weekday: String(lookup.weekday || 'MON').toUpperCase(),
    hour: Number(lookup.hour || 0),
    minute: Number(lookup.minute || 0),
    second: Number(lookup.second || 0)
  };
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatMinutesAsTime(value) {
  const minutes = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function buildRestaurantTimeSlots(hours, date, timezone = 'Asia/Kolkata', durationMinutes = 60, intervalMinutes = 30) {
  if (!Array.isArray(hours) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return [];
  const dateValue = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(dateValue.getTime()) || dateValue.toISOString().slice(0, 10) !== date) return [];
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || !Number.isInteger(intervalMinutes) || intervalMinutes <= 0) return [];

  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
    .format(dateValue)
    .toUpperCase();
  const schedules = hours.filter((entry) => String(entry.day || entry.dayOfWeek || '').toUpperCase() === weekday);
  const slots = [];

  for (const schedule of schedules) {
    if (schedule.isClosed) continue;
    for (const interval of Array.isArray(schedule.intervals) ? schedule.intervals : []) {
      const openMinutes = timeToMinutes(interval.open);
      let closeMinutes = timeToMinutes(interval.close);
      if (openMinutes === null || closeMinutes === null) continue;
      if (closeMinutes <= openMinutes) closeMinutes += 1440;

      for (let start = openMinutes; start + durationMinutes <= closeMinutes && start < 1440; start += intervalMinutes) {
        slots.push({
          startTime: formatMinutesAsTime(start),
          endTime: formatMinutesAsTime(start + durationMinutes),
        });
      }
    }
  }

  return Array.from(new Map(slots.map((slot) => [slot.startTime, slot])).values())
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

function isRestaurantOpenNow(restaurant, referenceDate = new Date()) {
  if (!restaurant || !Array.isArray(restaurant.hours) || restaurant.hours.length === 0) {
    return true;
  }

  const timezone = restaurant.timezone || 'Asia/Kolkata';
  const local = getTimeZoneParts(referenceDate, timezone);
  const currentDay = local.weekday.toUpperCase();
  const currentMinutes = local.hour * 60 + local.minute;
  const todaySchedule = restaurant.hours.find((entry) => String(entry.day).toUpperCase() === currentDay) || null;

  if (!todaySchedule || todaySchedule.isClosed === true) {
    return false;
  }

  const intervals = Array.isArray(todaySchedule.intervals) ? todaySchedule.intervals : [];
  for (const interval of intervals) {
    const openMinutes = timeToMinutes(interval.open);
    const closeMinutes = timeToMinutes(interval.close);
    if (openMinutes === null || closeMinutes === null) continue;

    if (openMinutes <= closeMinutes) {
      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) return true;
    } else {
      if (currentMinutes >= openMinutes || currentMinutes < closeMinutes) return true;
    }
  }

  return false;
}

module.exports = {
  slugify,
  isUuid,
  normalizePriceLevel,
  normalizeRestaurantPayload,
  dedupeRestaurants,
  buildRestaurantSearchCacheKey,
  buildNearbyQueryKey,
  parseOptionalBoolean,
  isRestaurantOpenNow,
  getTimeZoneParts,
  timeToMinutes,
  buildRestaurantTimeSlots,
  normalizeHours,
  normalizePhotos,
  normalizeMenu,
  coerceArray
};
