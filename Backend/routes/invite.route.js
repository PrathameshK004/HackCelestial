const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/invite.controller');
const verifyToken = require('../middleware/auth.middleware');

// Public route to view invite details
router.get('/:inviteCode', inviteController.getInviteDetails);

// Protected route to accept invite and join group
router.post('/:inviteCode/accept', verifyToken, inviteController.acceptInvite);

module.exports = router;
