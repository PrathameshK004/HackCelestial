const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth.middleware');
const savedTripController = require('../controllers/savedTrip.controller');

router.use(verifyToken);
router.get('/', savedTripController.getSavedTrips);
router.post('/', savedTripController.saveTrip);
router.delete('/:stayId', savedTripController.removeSavedTrip);

module.exports = router;