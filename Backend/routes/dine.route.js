const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const {
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
} = require('../controllers/dine.controller');

router.get('/restaurants/nearby', handleNearbyRestaurants);
router.get('/restaurants/search', handleSearchRestaurants);
router.get('/restaurants/:restaurantId/availability', handleGetRestaurantAvailability);
router.get('/restaurants/:restaurantId', handleGetRestaurant);
router.get('/restaurants/:restaurantId/menu', handleGetRestaurantMenu);
router.get('/restaurants/:restaurantId/photos', handleGetRestaurantPhotos);
router.get('/restaurants/:restaurantId/offers', handleGetRestaurantOffers);
router.get('/restaurants/:restaurantId/hours', handleGetRestaurantHours);
router.get('/restaurants/favorites', verifyToken, handleGetFavorites);
router.post('/restaurants/:restaurantId/favorite', verifyToken, handleToggleFavorite);
router.post('/restaurants/:restaurantId/reservations', verifyToken, handleCreateRestaurantReservation);
router.delete('/restaurants/:restaurantId/favorite', verifyToken, handleToggleFavorite);
router.post('/trips/:tripId/dining', verifyToken, handleCreateDiningActivity);
router.post('/groups/:groupId/dining', verifyToken, handleCreateDiningActivity);

module.exports = router;
