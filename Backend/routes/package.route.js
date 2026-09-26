const express = require('express');
const router = express.Router();
const packageController = require('../controllers/package.controller');
const verifyToken = require('../middleware/auth.middleware');

router.get('/explore', packageController.getExplorePackages);
router.get('/', packageController.getExplorePackages);
router.post('/:packageId/reservations', verifyToken, packageController.createReservation);

module.exports = router;
