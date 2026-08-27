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
router.post('/:groupId/expenses', verifyToken, groupController.addExpense);
router.get('/:groupId/settlement', verifyToken, groupController.getSettlement);
router.post('/:groupId/settle', verifyToken, groupController.settleGroup);
router.post('/:groupId/settlement-payments', verifyToken, groupController.recordSettlement);

// Group Invitations
router.post('/:groupId/invites', verifyToken, inviteController.createGroupInvite);

module.exports = router;
