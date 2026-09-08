
let express = require("express");
let router = express.Router();
let usersController = require('../controllers/user.controller');
let paymentController = require('../controllers/payment.controller');
let userMiddleware = require('../middleware/user.middleware');
const { sendSuccess } = require('../utils/response.util');

let verifyToken = require('../middleware/auth.middleware');


router.get('/checkAuth', verifyToken, (req, res) => {
    return sendSuccess(res, 'Authentication successful', {
        isAuthenticated: true,
        userKey: req.userKey
    });
});

router.get('/logout', usersController.logoutUser);
router.post('/refresh', usersController.refreshAccessToken);

// User payments ledger & unified record payment
router.get('/me/payments', verifyToken, paymentController.getMyPayments);
router.post('/me/record-payment', verifyToken, paymentController.recordUnifiedPayment);

// Password recovery with OTP
router.post('/forgot-password', usersController.forgotPassword);
router.post('/verify-reset-otp', usersController.verifyResetOtp);
router.post('/reset-password', usersController.resetPassword);

// Security: Change password (supports both POST and PUT)
router.post('/change-password', verifyToken, usersController.changePassword);
router.put('/change-password', verifyToken, usersController.changePassword);

// Profile management with real-time sync
router.get('/profile', verifyToken, (req, res) => {
    req.params.userId = req.userKey;
    return usersController.getUserById(req, res);
});
router.put('/profile', verifyToken, usersController.updateProfile);

router.get('/:userId', verifyToken, userMiddleware.validateUserId, usersController.getUserById);
router.post('/login', userMiddleware.checkLogin, usersController.validateLogin);
router.post('/google-login', usersController.googleLogin);
router.post('/registerUser', userMiddleware.validateNewUser, usersController.createUser);
router.post('/registerTempUser', userMiddleware.validateNewTempUser, usersController.createTempUser);
router.post('/check-registered', usersController.checkRegisteredUser);
router.get('/check-registered', usersController.checkRegisteredUser);
router.put('/:userId', verifyToken, userMiddleware.validateUserId, usersController.updateUser);
router.delete('/:userId', verifyToken, userMiddleware.validateUserId, usersController.deleteUser);
router.post("/sendOtp", userMiddleware.validateOtpReq, usersController.sendOTP);

module.exports = router;


