const crypto = require('crypto');
const { pool } = require('../../utils/db.util');
const { verifyGroupAccess } = require('../../utils/groupAuth.util');
const {
  buildRestaurantSearchCacheKey,
  buildNearbyQueryKey,
  normalizeRestaurantPayload,
  dedupeRestaurants,
  isRestaurantOpenNow,
  buildRestaurantTimeSlots
} = require('../../utils/dine.util');
const { withCache } = require('../../utils/cache.util');
const { getConfiguredProvider } = require('./restaurant.provider');

const MAX_RADIUS_METERS = Number(process.env.DINE_MAX_SEARCH_RADIUS || 25000);
const MAX_PAGE_SIZE = Number(process.env.DINE_MAX_PAGE_SIZE || 50);

function sanitizeLimit(limit = 20) {
  const parsed = Number(limit) || 20;
  return Math.min(Math.max(parsed, 1), MAX_PAGE_SIZE);
}

function sanitizeRadius(radius = 5000) {
  const parsed = Number(radius) || 5000;
  return Math.min(Math.max(parsed, 100), MAX_RADIUS_METERS);
}

function parseJsonLikeValue(value, fallback = []) {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : fallback);
    } catch {
      return trimmed
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  return fallback;
}

function mapRestaurantRow(row) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    id: row.id,
    provider: row.provider,
    providerPlaceId: row.provider_place_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    priceLevel: row.price_level,
    phone: row.phone,
    website: row.website,
    primaryImage: row.primary_image,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    postalCode: row.postal_code,
    latitude: Number(row.latitude || 0),
    longitude: Number(row.longitude || 0),
    timezone: row.timezone || 'Asia/Kolkata',
    groupFriendly: Boolean(row.is_group_friendly),
    isActive: Boolean(row.is_active),
    cuisine: parseJsonLikeValue(row.cuisine_list ?? row.cuisines, []),
    hours: parseJsonLikeValue(row.hours_json, []),
    photos: parseJsonLikeValue(row.photos_json, []),
    offers: parseJsonLikeValue(row.offers_json, []),
    menu: Array.isArray(payload.menu) ? payload.menu : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function upsertRestaurantFromProvider(restaurantPayload) {
  const normalized = normalizeRestaurantPayload(restaurantPayload);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const restaurantRes = await client.query(`
      INSERT INTO dine_restaurants (
        id, provider, provider_place_id, slug, name, description, status, rating, review_count,
        price_level, phone, website, primary_image, address, city, state, country, postal_code,
        latitude, longitude, timezone, is_group_friendly, is_active, cuisines, payload,
        provider_last_synced_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, NOW(), NOW(), NOW()
      )
      ON CONFLICT (provider, provider_place_id) WHERE provider_place_id IS NOT NULL DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        rating = EXCLUDED.rating,
        review_count = EXCLUDED.review_count,
        price_level = EXCLUDED.price_level,
        phone = EXCLUDED.phone,
        website = EXCLUDED.website,
        primary_image = EXCLUDED.primary_image,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        postal_code = EXCLUDED.postal_code,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        timezone = EXCLUDED.timezone,
        is_group_friendly = EXCLUDED.is_group_friendly,
        is_active = EXCLUDED.is_active,
        cuisines = EXCLUDED.cuisines,
        payload = EXCLUDED.payload,
        provider_last_synced_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [
      normalized.id,
      normalized.provider,
      normalized.providerPlaceId,
      normalized.slug,
      normalized.name,
      normalized.description,
      normalized.status,
      normalized.rating,
      normalized.reviewCount,
      normalized.priceLevel,
      normalized.phone,
      normalized.website,
      normalized.primaryImage,
      normalized.address,
      normalized.city,
      normalized.state,
      normalized.country,
      normalized.postalCode,
      normalized.latitude,
      normalized.longitude,
      normalized.timezone,
      normalized.groupFriendly,
      normalized.isActive,
      JSON.stringify(normalized.cuisine || []),
      JSON.stringify(normalized)
    ]);

    const restaurantId = restaurantRes.rows[0].id;

    await client.query('DELETE FROM dine_restaurant_cuisines WHERE restaurant_id = $1', [restaurantId]);
    if (normalized.cuisine && normalized.cuisine.length) {
      const cuisineRows = normalized.cuisine.map((cuisine) => [restaurantId, cuisine]);
      const cuisinePlaceholders = cuisineRows.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ');
      await client.query(`INSERT INTO dine_restaurant_cuisines (restaurant_id, cuisine) VALUES ${cuisinePlaceholders}`, cuisineRows.flat());
    }

    await client.query('DELETE FROM dine_restaurant_menu_categories WHERE restaurant_id = $1', [restaurantId]);
    const menuCategories = normalized.menu || [];
    if (menuCategories.length) {
      const categoryRows = menuCategories.map((category, index) => [
        crypto.randomUUID(), restaurantId, category.name, category.description || '', Number(category.sortOrder || index)
      ]);
      const categoryPlaceholders = categoryRows.map((_, rowIndex) =>
        `(${Array.from({ length: 5 }, (_, columnIndex) => `$${rowIndex * 5 + columnIndex + 1}`).join(', ')})`
      ).join(', ');
      await client.query(`
        INSERT INTO dine_restaurant_menu_categories (id, restaurant_id, name, description, sort_order)
        VALUES ${categoryPlaceholders}
      `, categoryRows.flat());

      const categoryIds = await client.query(
        'SELECT id, name FROM dine_restaurant_menu_categories WHERE restaurant_id = $1',
        [restaurantId]
      );
      const categoryIdByName = new Map(categoryIds.rows.map((category) => [category.name, category.id]));
      const itemRows = menuCategories.flatMap((category, categoryIndex) =>
        (category.items || []).map((item, itemIndex) => [
          crypto.randomUUID(),
          categoryIdByName.get(category.name),
          item.name,
          item.description || '',
          Number(item.price || 0),
          item.currency || 'INR',
          item.image || null,
          Boolean(item.isVegetarian),
          Boolean(item.isVegan),
          item.isAvailable !== false,
          JSON.stringify(item.dietaryTags || []),
          Number(item.sortOrder ?? itemIndex)
        ])
      );

      if (itemRows.length) {
        const itemPlaceholders = itemRows.map((_, rowIndex) =>
          `(${Array.from({ length: 12 }, (_, columnIndex) => `$${rowIndex * 12 + columnIndex + 1}`).join(', ')})`
        ).join(', ');
        await client.query(`
          INSERT INTO dine_restaurant_menu_items (
            id, category_id, name, description, price, currency, image_url,
            is_vegetarian, is_vegan, is_available, dietary_tags, sort_order
          ) VALUES ${itemPlaceholders}
        `, itemRows.flat());
      }
    }

    await client.query('DELETE FROM dine_restaurant_hours WHERE restaurant_id = $1', [restaurantId]);
    if (normalized.hours && normalized.hours.length) {
      const hourRows = [];
      normalized.hours.forEach((entry) => {
        entry.intervals.forEach((interval) => {
          hourRows.push([restaurantId, entry.day, interval.open || null, interval.close || null, Boolean(entry.isClosed), normalized.timezone]);
        });
      });

      if (hourRows.length) {
        const placeHolders = hourRows.map((_, index) => `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`).join(', ');
        await client.query(`INSERT INTO dine_restaurant_hours (restaurant_id, day_of_week, open_time, close_time, is_closed, timezone) VALUES ${placeHolders}`, hourRows.flat());
      }
    }

    await client.query('DELETE FROM dine_restaurant_photos WHERE restaurant_id = $1', [restaurantId]);
    if (normalized.photos && normalized.photos.length) {
      const photoRows = normalized.photos.map((photo) => [restaurantId, photo.url, Boolean(photo.isPrimary), photo.caption || '']);
      const photoPlaceholders = photoRows.map((_, index) => `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`).join(', ');
      await client.query(`INSERT INTO dine_restaurant_photos (restaurant_id, image_url, is_primary, caption) VALUES ${photoPlaceholders}`, photoRows.flat());
    }

    await client.query('DELETE FROM dine_restaurant_offers WHERE restaurant_id = $1', [restaurantId]);
    if (normalized.offers && normalized.offers.length) {
      const offerRows = normalized.offers.map((offer) => [
        restaurantId,
        offer.title,
        offer.description || '',
        String(offer.discountType || 'PERCENTAGE'),
        Number(offer.discount || offer.value || 0),
        new Date().toISOString(),
        offer.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        JSON.stringify({ currency: offer.currency || 'INR', minGroupSize: 2 }),
        true
      ]);
      const offerPlaceholders = offerRows.map((_, index) => `($${index * 9 + 1}, $${index * 9 + 2}, $${index * 9 + 3}, $${index * 9 + 4}, $${index * 9 + 5}, $${index * 9 + 6}, $${index * 9 + 7}, $${index * 9 + 8}, $${index * 9 + 9})`).join(', ');
      await client.query(`INSERT INTO dine_restaurant_offers (restaurant_id, title, description, discount_type, discount_value, starts_at, ends_at, eligibility, is_active) VALUES ${offerPlaceholders}`, offerRows.flat());
    }

    await client.query('COMMIT');
    return mapRestaurantRow(restaurantRes.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getRestaurantById(restaurantId) {
  const cacheKey = `dine:restaurant:${restaurantId}`;

  return withCache({
    key: cacheKey,
    ttlSeconds: 900,
    namespace: 'dine:restaurants',
    fetcher: async () => {
      const res = await pool.query(`
        SELECT r.*, (
          SELECT json_agg(c.cuisine ORDER BY c.cuisine) FROM dine_restaurant_cuisines c WHERE c.restaurant_id = r.id
        ) as cuisine_list,
        (
          SELECT json_agg(json_build_object('day', h.day_of_week, 'intervals', json_build_array(json_build_object('open', h.open_time, 'close', h.close_time)))) FROM dine_restaurant_hours h WHERE h.restaurant_id = r.id
        ) as hours_json,
        (
          SELECT json_agg(json_build_object('url', p.image_url, 'isPrimary', p.is_primary, 'caption', p.caption)) FROM dine_restaurant_photos p WHERE p.restaurant_id = r.id
        ) as photos_json,
        (
          SELECT json_agg(json_build_object('title', o.title, 'description', o.description, 'discount', o.discount_value, 'currency', 'INR', 'validUntil', o.ends_at)) FROM dine_restaurant_offers o WHERE o.restaurant_id = r.id
        ) as offers_json
        FROM dine_restaurants r WHERE r.id::text = $1 OR r.slug = $1 LIMIT 1
      `, [restaurantId]);

      if (res.rows.length === 0) {
        const provider = getConfiguredProvider();
        const restaurant = await provider.getRestaurantDetails(restaurantId);
        if (!restaurant) {
          return null;
        }
        return await upsertRestaurantFromProvider(restaurant);
      }

      return mapRestaurantRow(res.rows[0]);
    }
  });
}

async function searchRestaurants(params = {}) {
  const query = String(params.query || '').trim();
  const radius = sanitizeRadius(params.radius);
  const limit = sanitizeLimit(params.limit);
  const page = Math.max(1, Number(params.page || 1));
  const offset = (page - 1) * limit;
  const cuisine = String(params.cuisine || '').trim();
  const priceLevel = String(params.priceLevel || params.price_level || '').trim();
  const rating = Number(params.rating || 0);
  const openNow = Boolean(params.openNow);
  const groupFriendly = params.groupFriendly !== undefined ? Boolean(params.groupFriendly) : undefined;

  const cacheKey = buildRestaurantSearchCacheKey({
    query,
    latitude: params.latitude,
    longitude: params.longitude,
    radius,
    cuisine,
    priceLevel,
    rating,
    openNow,
    groupFriendly,
    sort: params.sort || 'relevance',
    page,
    limit
  });

  const data = await withCache({
    key: cacheKey,
    ttlSeconds: 600,
    namespace: 'dine:search',
    fetcher: async () => {
      let sql = `
        SELECT r.*,
          (
            SELECT json_agg(c.cuisine ORDER BY c.cuisine) FROM dine_restaurant_cuisines c WHERE c.restaurant_id = r.id
          ) as cuisine_list,
          (
            SELECT json_agg(json_build_object('day', h.day_of_week, 'intervals', json_build_array(json_build_object('open', h.open_time, 'close', h.close_time)))) FROM dine_restaurant_hours h WHERE h.restaurant_id = r.id
          ) as hours_json,
          (
            SELECT json_agg(json_build_object('url', p.image_url, 'isPrimary', p.is_primary, 'caption', p.caption)) FROM dine_restaurant_photos p WHERE p.restaurant_id = r.id
          ) as photos_json,
          (
            SELECT json_agg(json_build_object('title', o.title, 'description', o.description, 'discount', o.discount_value, 'currency', 'INR', 'validUntil', o.ends_at)) FROM dine_restaurant_offers o WHERE o.restaurant_id = r.id
          ) as offers_json
        FROM dine_restaurants r
        WHERE r.is_active = true
      `;

      const paramsArray = [];
      let index = 1;

      if (query) {
        sql += ` AND (
          LOWER(r.name) LIKE $${index}
          OR LOWER(r.address) LIKE $${index}
          OR LOWER(r.city) LIKE $${index}
          OR LOWER(r.cuisines::text) LIKE $${index}
          OR LOWER(r.payload::text) LIKE $${index}
        )`;
        paramsArray.push(`%${query.toLowerCase()}%`);
        index += 1;
      }

      if (cuisine) {
        sql += ` AND EXISTS (
          SELECT 1 FROM dine_restaurant_cuisines dc WHERE dc.restaurant_id = r.id AND LOWER(dc.cuisine) LIKE $${index}
        )`;
        paramsArray.push(`%${cuisine.toLowerCase()}%`);
        index += 1;
      }

      if (priceLevel) {
        sql += ` AND r.price_level = $${index}`;
        paramsArray.push(priceLevel);
        index += 1;
      }

      if (rating) {
        sql += ` AND r.rating >= $${index}`;
        paramsArray.push(rating);
        index += 1;
      }

      if (groupFriendly !== undefined) {
        sql += ` AND r.is_group_friendly = $${index}`;
        paramsArray.push(groupFriendly);
        index += 1;
      }

      if (params.latitude && params.longitude) {
        sql += ` AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL`;
      }

      sql += ` ORDER BY r.rating DESC NULLS LAST, r.updated_at DESC`;
      sql += ` LIMIT $${index} OFFSET $${index + 1}`;
      paramsArray.push(limit, offset);

      const res = await pool.query(sql, paramsArray);
      let rows = res.rows.map(mapRestaurantRow);

      if (params.latitude && params.longitude) {
        rows = rows.filter((restaurant) => {
          const dist = haversineKm(params.latitude, params.longitude, restaurant.latitude, restaurant.longitude);
          return dist <= radius / 1000;
        });
      }

      if (openNow) {
        rows = rows.filter((restaurant) => isRestaurantOpenNow(restaurant, new Date()));
      }

      return rows;
    }
  });

  return {
    data: data.slice(0, limit),
    pagination: {
      page,
      limit,
      total: data.length,
      hasMore: data.length > page * limit
    }
  };
}

async function searchNearby(params = {}) {
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const radius = sanitizeRadius(params.radius);
  const limit = sanitizeLimit(params.limit);
  const page = Math.max(1, Number(params.page || 1));
  const offset = (page - 1) * limit;
  const cuisine = String(params.cuisine || '').trim();
  const priceLevel = String(params.priceLevel || params.price_level || '').trim();
  const groupFriendly = params.groupFriendly !== undefined ? Boolean(params.groupFriendly) : undefined;

  if (!latitude || !longitude) {
    throw new Error('latitude and longitude are required');
  }

  const cacheKey = buildNearbyQueryKey({
    latitude,
    longitude,
    radius,
    cuisine,
    priceLevel,
    openNow: Boolean(params.openNow),
    groupFriendly
  });

  const data = await withCache({
    key: `${cacheKey}:page:${page}:limit:${limit}`,
    ttlSeconds: 600,
    namespace: 'dine:nearby',
    fetcher: async () => {
      const rows = await pool.query(`
        SELECT r.*,
          (
            SELECT json_agg(c.cuisine ORDER BY c.cuisine) FROM dine_restaurant_cuisines c WHERE c.restaurant_id = r.id
          ) as cuisine_list,
          (
            SELECT json_agg(json_build_object('day', h.day_of_week, 'intervals', json_build_array(json_build_object('open', h.open_time, 'close', h.close_time)))) FROM dine_restaurant_hours h WHERE h.restaurant_id = r.id
          ) as hours_json,
          (
            SELECT json_agg(json_build_object('url', p.image_url, 'isPrimary', p.is_primary, 'caption', p.caption)) FROM dine_restaurant_photos p WHERE p.restaurant_id = r.id
          ) as photos_json,
          (
            SELECT json_agg(json_build_object('title', o.title, 'description', o.description, 'discount', o.discount_value, 'currency', 'INR', 'validUntil', o.ends_at)) FROM dine_restaurant_offers o WHERE o.restaurant_id = r.id
          ) as offers_json
        FROM dine_restaurants r
        WHERE r.is_active = true
          AND r.latitude IS NOT NULL
          AND r.longitude IS NOT NULL
      `, []);

      let list = rows.rows.map(mapRestaurantRow).filter((restaurant) => {
        const distanceKm = haversineKm(latitude, longitude, restaurant.latitude, restaurant.longitude);
        return distanceKm <= radius / 1000;
      });

      if (cuisine) {
        list = list.filter((restaurant) => restaurant.cuisine.some((item) => item.toLowerCase().includes(cuisine.toLowerCase())));
      }

      if (priceLevel) {
        list = list.filter((restaurant) => restaurant.priceLevel === priceLevel);
      }

      if (groupFriendly !== undefined) {
        list = list.filter((restaurant) => restaurant.groupFriendly === groupFriendly);
      }

      if (params.openNow) {
        list = list.filter((restaurant) => isRestaurantOpenNow(restaurant, new Date()));
      }

      list.sort((a, b) => {
        const distA = haversineKm(latitude, longitude, a.latitude, a.longitude);
        const distB = haversineKm(latitude, longitude, b.latitude, b.longitude);
        return distA - distB;
      });

      return list.slice(offset, offset + limit);
    }
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total: data.length,
      hasMore: data.length > page * limit
    }
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

async function getRestaurantMenu(restaurantId) {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return [];
  const result = await pool.query(`
    SELECT c.id, c.name, c.description, c.sort_order,
           COALESCE(
             json_agg(json_build_object(
               'id', i.id,
               'name', i.name,
               'description', i.description,
               'price', i.price,
               'currency', i.currency,
               'image', i.image_url,
               'isVegetarian', i.is_vegetarian,
               'isVegan', i.is_vegan,
               'isAvailable', i.is_available,
               'dietaryTags', i.dietary_tags,
               'sortOrder', i.sort_order
             ) ORDER BY i.sort_order) FILTER (WHERE i.id IS NOT NULL),
             '[]'::json
           ) AS items
    FROM dine_restaurant_menu_categories c
    LEFT JOIN dine_restaurant_menu_items i ON i.category_id = c.id
    WHERE c.restaurant_id = $1
    GROUP BY c.id
    ORDER BY c.sort_order, c.name
  `, [restaurant.id]);

  if (result.rows.length) {
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      sortOrder: Number(row.sort_order || 0),
      items: row.items
    }));
  }

  return Array.isArray(restaurant.menu) ? restaurant.menu : [];
}

async function getRestaurantPhotos(restaurantId) {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return [];

  return withCache({
    key: `dine:restaurant:${restaurantId}:photos`,
    ttlSeconds: 600,
    namespace: 'dine:photos',
    fetcher: async () => {
      const provider = getConfiguredProvider();
      return await provider.getRestaurantPhotos(restaurantId);
    }
  });
}

async function getRestaurantOffers(restaurantId) {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return [];

  return withCache({
    key: `dine:restaurant:${restaurantId}:offers`,
    ttlSeconds: 300,
    namespace: 'dine:offers',
    fetcher: async () => {
      const provider = getConfiguredProvider();
      return await provider.getRestaurantOffers(restaurantId);
    }
  });
}

async function getRestaurantHours(restaurantId) {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return [];
  const result = await pool.query(`
    SELECT day_of_week, open_time, close_time, is_closed, timezone
    FROM dine_restaurant_hours
    WHERE restaurant_id = $1
    ORDER BY day_of_week, open_time
  `, [restaurant.id]);
  const hoursByDay = new Map();
  for (const row of result.rows) {
    const day = String(row.day_of_week).toUpperCase();
    if (!hoursByDay.has(day)) {
      hoursByDay.set(day, { day, intervals: [], isClosed: Boolean(row.is_closed), timezone: row.timezone || restaurant.timezone });
    }
    if (row.open_time && row.close_time) {
      hoursByDay.get(day).intervals.push({ open: row.open_time, close: row.close_time });
    }
  }
  return Array.from(hoursByDay.values());
}

async function getRestaurantAvailability(restaurantId, date, durationMinutes = 60) {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return null;
  const hours = await getRestaurantHours(restaurant.id);
  return {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    date,
    timezone: restaurant.timezone || 'Asia/Kolkata',
    durationMinutes,
    slots: buildRestaurantTimeSlots(hours, date, restaurant.timezone || 'Asia/Kolkata', durationMinutes)
  };
}

async function toggleFavorite({ userId, restaurantId }) {
  if (!userId || !restaurantId) {
    throw new Error('userId and restaurantId are required');
  }

  const existing = await pool.query('SELECT * FROM dine_restaurant_favorites WHERE user_id = $1 AND restaurant_id = $2', [userId, restaurantId]);
  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM dine_restaurant_favorites WHERE user_id = $1 AND restaurant_id = $2', [userId, restaurantId]);
    return { favorited: false };
  }

  await pool.query('INSERT INTO dine_restaurant_favorites (id, user_id, restaurant_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id, restaurant_id) DO NOTHING', [crypto.randomUUID(), userId, restaurantId]);
  return { favorited: true };
}

async function getFavoriteRestaurants(userId) {
  if (!userId) return [];
  const res = await pool.query(`
    SELECT r.* FROM dine_restaurants r
    JOIN dine_restaurant_favorites f ON f.restaurant_id = r.id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
  `, [userId]);
  return res.rows.map(mapRestaurantRow);
}

async function createDiningActivity({ groupId, restaurantId, date, startTime, endTime, participants = [], estimatedBudget = null, currency = 'INR', notes = '', createdByUserId }) {
  if (!groupId || !restaurantId || !date) {
    throw new Error('groupId, restaurantId and date are required');
  }

  const access = await verifyGroupAccess(groupId, createdByUserId, pool);
  if (!access.isAuthorized) {
    throw new Error('You are not authorized to add a dining activity to this trip');
  }

  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  const normalizedParticipants = Array.isArray(participants) ? participants : [];
  const memberRes = await pool.query('SELECT id, user_id, email FROM group_members WHERE group_id = $1', [groupId]);
  const validMemberIds = new Set(memberRes.rows.map((member) => String(member.id)));

  for (const participantId of normalizedParticipants) {
    if (!validMemberIds.has(String(participantId))) {
      throw new Error('One or more participants do not belong to this trip');
    }
  }

  const id = crypto.randomUUID();
  const result = await pool.query(`
    INSERT INTO dine_activities (
      id, group_id, restaurant_id, created_by, activity_date, start_time, end_time,
      participants, estimated_budget, currency, notes, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PLANNED', NOW())
    RETURNING *
  `, [id, groupId, restaurantId, createdByUserId, date, startTime || null, endTime || null, JSON.stringify(normalizedParticipants), estimatedBudget || null, currency, notes || null]);

  return {
    id: result.rows[0].id,
    groupId: result.rows[0].group_id,
    restaurantId: result.rows[0].restaurant_id,
    date: result.rows[0].activity_date,
    startTime: result.rows[0].start_time,
    endTime: result.rows[0].end_time,
    participants: JSON.parse(result.rows[0].participants || '[]'),
    estimatedBudget: result.rows[0].estimated_budget,
    currency: result.rows[0].currency,
    notes: result.rows[0].notes,
    status: result.rows[0].status,
    createdAt: result.rows[0].created_at
  };
}

async function createRestaurantReservation({ groupId, restaurantId, date, startTime, participants = [], guestCount, estimatedBudget = null, currency = 'INR', notes = '', createdByUserId }) {
  if (!groupId || !restaurantId || !date || !startTime) {
    throw new Error('groupId, restaurantId, date and startTime are required');
  }

  const availability = await getRestaurantAvailability(restaurantId, date);
  if (!availability) throw new Error('Restaurant not found');
  const selectedSlot = availability.slots.find((slot) => slot.startTime === String(startTime).slice(0, 5));
  if (!selectedSlot) {
    throw new Error('That time is outside this restaurant\'s available booking slots');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const access = await verifyGroupAccess(groupId, createdByUserId, client);
    if (!access.isAuthorized) {
      throw new Error('You are not authorized to book a restaurant for this trip');
    }

    const restaurantResult = await client.query(
      'SELECT id, name FROM dine_restaurants WHERE id::text = $1 AND is_active = TRUE LIMIT 1',
      [availability.restaurantId]
    );
    if (!restaurantResult.rows.length) throw new Error('Restaurant not found');

    const normalizedParticipants = Array.isArray(participants) ? participants.map(String) : [];
    const membersResult = await client.query('SELECT id FROM group_members WHERE group_id = $1', [groupId]);
    const validMemberIds = new Set(membersResult.rows.map((member) => String(member.id)));
    if (normalizedParticipants.some((participantId) => !validMemberIds.has(participantId))) {
      throw new Error('One or more guests do not belong to this trip');
    }

    const resolvedGuestCount = Number(guestCount || normalizedParticipants.length);
    if (!Number.isInteger(resolvedGuestCount) || resolvedGuestCount < 1 || resolvedGuestCount > 40) {
      throw new Error('Guest count must be between 1 and 40');
    }

    const activityId = crypto.randomUUID();
    await client.query(`
      INSERT INTO dine_activities (
        id, group_id, restaurant_id, created_by, activity_date, start_time, end_time,
        participants, estimated_budget, currency, notes, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PLANNED', NOW())
    `, [activityId, groupId, availability.restaurantId, createdByUserId, date, selectedSlot.startTime, selectedSlot.endTime, JSON.stringify(normalizedParticipants), estimatedBudget || null, currency, notes || null]);

    const reservationId = crypto.randomUUID();
    const reservationResult = await client.query(`
      INSERT INTO dine_restaurant_reservations (
        id, group_id, restaurant_id, activity_id, created_by, reservation_date,
        start_time, end_time, guest_count, participants, estimated_budget, currency, notes,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING_CONFIRMATION', NOW(), NOW())
      RETURNING id, group_id, restaurant_id, activity_id, reservation_date,
        start_time, end_time, guest_count, participants, estimated_budget, currency, notes, status, created_at
    `, [reservationId, groupId, availability.restaurantId, activityId, createdByUserId, date, selectedSlot.startTime, selectedSlot.endTime, resolvedGuestCount, JSON.stringify(normalizedParticipants), estimatedBudget || null, currency, notes || null]);

    await client.query('COMMIT');
    return { ...reservationResult.rows[0], restaurantName: restaurantResult.rows[0].name };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getRestaurantById,
  searchRestaurants,
  searchNearby,
  getRestaurantMenu,
  getRestaurantPhotos,
  getRestaurantOffers,
  getRestaurantHours,
  getRestaurantAvailability,
  createRestaurantReservation,
  toggleFavorite,
  getFavoriteRestaurants,
  createDiningActivity,
  upsertRestaurantFromProvider,
  sanitizeRadius,
  sanitizeLimit
};
