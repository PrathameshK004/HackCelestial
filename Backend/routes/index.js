const express = require('express');
const router = express.Router();

const userRoutes = require('./user.route');
const groupRoutes = require('./group.route');
const inviteRoutes = require('./invite.route');
const paymentRoutes = require('./payment.route');
const healthController = require('../controllers/health.controller');

// Health Check Endpoint
router.get('/health', healthController.checkHealth);

// API Microservices Gateway Routing
router.use('/users', userRoutes);
router.use('/groups', groupRoutes);
router.use('/invites', inviteRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;