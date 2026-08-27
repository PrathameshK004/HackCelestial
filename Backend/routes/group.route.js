const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const inviteController = require('../controllers/invite.controller');
const verifyToken = require('../middleware/auth.middleware');

// Protected group routes
router.post('/', verifyToken, groupController.createGroup);
router.get('/my-groups', verifyToken, groupController.getMyGroups);
router.get('/:groupId', verifyToken, groupController.getGroupById);
router.put('/:groupId', verifyToken, groupController.updateGroup);
router.delete('/:groupId', verifyToken, groupController.deleteGroup);

// Group Members Management
router.post('/:groupId/members', verifyToken, groupController.addGroupMember);
router.delete('/:groupId/members/:memberId', verifyToken, groupController.removeGroupMember);

// Group Invitations
router.post('/:groupId/invites', verifyToken, inviteController.createGroupInvite);

module.exports = router;
