const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const inviteController = require('../controllers/invite.controller');
const expenseController = require('../controllers/expense.controller');
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
router.post('/:groupId/invites/resend', verifyToken, groupController.resendInvite);

// Split Expenses Ledger & Settlements
router.post('/:groupId/expenses', verifyToken, expenseController.addExpense);
router.get('/:groupId/expenses', verifyToken, expenseController.getGroupExpenses);
router.delete('/:groupId/expenses/:expenseId', verifyToken, expenseController.deleteExpense);
router.get('/:groupId/settlement', verifyToken, expenseController.getGroupSettlement);
router.post('/:groupId/settlements', verifyToken, expenseController.recordSettlement);
router.post('/:groupId/settle', verifyToken, expenseController.settleGroup);
router.get('/:groupId/audit-log', verifyToken, expenseController.getAuditLog);

module.exports = router;

