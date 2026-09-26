const express = require('express');
const router = express.Router();

const userRoutes = require('./user.route');
const groupRoutes = require('./group.route');
const inviteRoutes = require('./invite.route');
const paymentRoutes = require('./payment.route');
const notificationRoutes = require('./notification.route');
const packageRoutes = require('./package.route');
const savedTripRoutes = require('./savedTrip.route');
const supportRoutes = require('./support.route');
const dineRoutes = require('./dine.route');
const dineController = require('../controllers/dine.controller');
const healthController = require('../controllers/health.controller');

// Health Check Endpoint
router.get('/health', healthController.checkHealth);

const verifyToken = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

// API Microservices Gateway Routing
router.use('/users', userRoutes);
router.use('/groups', groupRoutes);
router.use('/invites', inviteRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/user-notifications', notificationRoutes);
router.use('/packages', packageRoutes);
router.use('/saved-trips', savedTripRoutes);
router.use('/support', supportRoutes);
router.use('/dine', dineRoutes);
router.post('/trips/:tripId/dining', verifyToken, dineController.handleCreateDiningActivity);
router.post('/groups/:groupId/dining', verifyToken, dineController.handleCreateDiningActivity);
router.post('/user-push-tokens', verifyToken, userController.registerPushToken);
router.delete('/user-push-tokens', verifyToken, userController.unregisterPushToken);

module.exports = router;