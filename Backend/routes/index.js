const express = require('express');
const router = express.Router();

const userRoutes = require('./user.route');
const groupRoutes = require('./group.route');
const inviteRoutes = require('./invite.route');

// API Microservices Gateway Routing
router.use('/users', userRoutes);
router.use('/groups', groupRoutes);
router.use('/invites', inviteRoutes);

module.exports = router;