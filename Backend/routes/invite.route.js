const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/invite.controller');
const verifyToken = require('../middleware/auth.middleware');

// Protected route to list user's pending invitations
router.get('/my-pending', verifyToken, inviteController.getMyPendingInvitations);

// Public route to view invite details
router.get('/:inviteCode', inviteController.getInviteDetails);

// Protected route to accept invite and join group (approves membership)
router.post('/:inviteCode/accept', verifyToken, inviteController.acceptInvite);

// Protected route to reject/decline invite
router.post('/:inviteCode/reject', verifyToken, inviteController.rejectInvite);

module.exports = router;

