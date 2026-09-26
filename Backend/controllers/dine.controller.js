const { sendSuccess, sendError } = require('../utils/response.util');
const { verifyGroupAccess } = require('../utils/groupAuth.util');
const {
  searchNearby,
  searchRestaurants,
  getRestaurantById,
  getRestaurantMenu,
  getRestaurantPhotos,
  getRestaurantOffers,
  getRestaurantHours,
  getRestaurantAvailability,
  toggleFavorite,
  getFavoriteRestaurants,
  createDiningActivity,
  createRestaurantReservation
} = require('../services/dine/dine.service');
const { parseOptionalBoolean } = require('../utils/dine.util');

async function handleNearbyRestaurants(req, res) {
  try {
    const { latitude, longitude, radius, limit, page, cuisine, priceLevel, openNow, groupFriendly } = req.query;
    const data = await searchNearby({
      latitude,
      longitude,
      radius,
      limit,
      page,
      cuisine,
      priceLevel,
      openNow: parseOptionalBoolean(openNow),
      groupFriendly: parseOptionalBoolean(groupFriendly)
    });
    return sendSuccess(res, 'Nearby restaurants fetched', data, 200);
  } catch (error) {
    return sendError(res, error.message || 'Nearby restaurant search failed', error, 400);
  }
}

async function handleSearchRestaurants(req, res) {
  try {
    const { q, query, latitude, longitude, radius, cuisine, priceLevel, rating, openNow, groupFriendly, sort, page, limit } = req.query;
    const data = await searchRestaurants({
      query: q || query,
      latitude,
      longitude,
      radius,
      cuisine,
      priceLevel,
      rating,
      openNow: parseOptionalBoolean(openNow),
      groupFriendly: parseOptionalBoolean(groupFriendly),
      sort,
      page,
      limit
    });
    return sendSuccess(res, 'Restaurant search completed', data, 200);
  } catch (error) {
    return sendError(res, error.message || 'Restaurant search failed', error, 400);
  }
}

async function handleGetRestaurant(req, res) {
  try {
    const restaurant = await getRestaurantById(req.params.restaurantId);
    if (!restaurant) {
      return sendError(res, 'Restaurant not found', { code: 'RESTAURANT_NOT_FOUND' }, 404);
    }
    return sendSuccess(res, 'Restaurant details fetched', { restaurant }, 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch restaurant details', error, 400);
  }
}

async function handleGetRestaurantMenu(req, res) {
  try {
    const menu = await getRestaurantMenu(req.params.restaurantId);
    return sendSuccess(res, 'Menu fetched', { menu }, 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch menu', error, 400);
  }
}

async function handleGetRestaurantPhotos(req, res) {
  try {
    const photos = await getRestaurantPhotos(req.params.restaurantId);
    return sendSuccess(res, 'Restaurant photos fetched', { photos }, 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch photos', error, 400);
  }
}

async function handleGetRestaurantOffers(req, res) {
  try {
    const offers = await getRestaurantOffers(req.params.restaurantId);
    return sendSuccess(res, 'Restaurant offers fetched', { offers }, 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch offers', error, 400);
  }
}

async function handleGetRestaurantHours(req, res) {
  try {
    const hours = await getRestaurantHours(req.params.restaurantId);
    return sendSuccess(res, 'Restaurant hours fetched', { hours }, 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch hours', error, 400);
  }
}

async function handleGetRestaurantAvailability(req, res) {
  try {
    const { date } = req.query;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) {
      return sendError(res, 'A valid date in YYYY-MM-DD format is required', null, 400);
    }
    const availability = await getRestaurantAvailability(req.params.restaurantId, date);
    if (!availability) return sendError(res, 'Restaurant not found', null, 404);
    return sendSuccess(res, 'Restaurant booking slots fetched', { availability }, 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch restaurant availability', error, 400);
  }
}

async function handleToggleFavorite(req, res) {
  try {
    const result = await toggleFavorite({ userId: req.userKey, restaurantId: req.params.restaurantId });
    return sendSuccess(res, result.favorited ? 'Restaurant added to favorites' : 'Restaurant removed from favorites', { favorite: result }, 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to update favorite', error, 400);
  }
}

async function handleGetFavorites(req, res) {
  try {
    const favorites = await getFavoriteRestaurants(req.userKey);
    return sendSuccess(res, 'Favorite restaurants fetched', { favorites }, 200);
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch favorites', error, 400);
  }
}

async function handleCreateDiningActivity(req, res) {
  try {
    const { tripId, groupId } = req.params;
    const targetGroupId = groupId || tripId;
    const activity = await createDiningActivity({
      groupId: targetGroupId,
      restaurantId: req.body.restaurantId,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      participants: req.body.participants || [],
      estimatedBudget: req.body.estimatedBudget,
      currency: req.body.currency || 'INR',
      notes: req.body.notes || '',
      createdByUserId: req.userKey
    });
    return sendSuccess(res, 'Dining activity created', { activity }, 201);
  } catch (error) {
    return sendError(res, error.message || 'Failed to create dining activity', error, 400);
  }
}

async function handleCreateRestaurantReservation(req, res) {
  try {
    const reservation = await createRestaurantReservation({
      groupId: req.body.groupId,
      restaurantId: req.params.restaurantId,
      date: req.body.date,
      startTime: req.body.startTime,
      participants: req.body.participants || [],
      guestCount: req.body.guestCount,
      estimatedBudget: req.body.estimatedBudget,
      currency: req.body.currency || 'INR',
      notes: req.body.notes || '',
      createdByUserId: req.userKey
    });
    return sendSuccess(res, 'Restaurant booking request saved to trip', { reservation }, 201);
  } catch (error) {
    return sendError(res, error.message || 'Failed to create restaurant booking', error, 400);
  }
}

module.exports = {
  handleNearbyRestaurants,
  handleSearchRestaurants,
  handleGetRestaurant,
  handleGetRestaurantMenu,
  handleGetRestaurantPhotos,
  handleGetRestaurantOffers,
  handleGetRestaurantHours,
  handleGetRestaurantAvailability,
  handleToggleFavorite,
  handleGetFavorites,
  handleCreateDiningActivity,
  handleCreateRestaurantReservation
};
