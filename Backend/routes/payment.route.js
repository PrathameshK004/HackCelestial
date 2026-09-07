const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const verifyToken = require('../middleware/auth.middleware');

// User payments ledger
router.get('/my-payments', verifyToken, paymentController.getMyPayments);

// Record unified payment (Expense with auto-split or Companion Settlement)
router.post('/record', verifyToken, paymentController.recordUnifiedPayment);

// Verify UPI payment callback and commit to group ledger
router.post('/verify-status', verifyToken, paymentController.verifyPaymentStatus);

module.exports = router;
