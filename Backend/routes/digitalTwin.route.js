const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const controller = require('../controllers/digitalTwin.controller');

router.use(verifyToken);
router.get('/weather', controller.getWeather);
router.get('/state', controller.getState);
router.get('/trips/:tripId/impact', controller.getTripImpact);
router.get('/social-signals', controller.getSocialSignals);
router.post('/simulate', controller.simulate);
router.get('/simulation/:id', controller.getSimulation);
router.get('/places/search', controller.searchNearbyPlaces);

module.exports = router;
