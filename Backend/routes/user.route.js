
let express = require("express");
let router = express.Router();
let usersController = require('../controllers/user.controller');
let paymentController = require('../controllers/payment.controller');
let illustrationController = require('../controllers/illustration.controller');
let userMiddleware = require('../middleware/user.middleware');
const { sendSuccess } = require('../utils/response.util');

let verifyToken = require('../middleware/auth.middleware');

// Google-style profile picture illustrations catalog
router.get('/illustrations', illustrationController.getIllustrations);


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

// Push notification device token registration
router.post('/push-token', verifyToken, usersController.registerPushToken);
router.delete('/push-token', verifyToken, usersController.unregisterPushToken);

// Password recovery with OTP
router.post('/forgot-password', usersController.forgotPassword);
router.post('/verify-reset-otp', usersController.verifyResetOtp);
router.post('/reset-password', usersController.resetPassword);

// Security: Change password & 2FA
router.post('/change-password', verifyToken, usersController.changePassword);
router.put('/change-password', verifyToken, usersController.changePassword);
router.post('/2fa/toggle', verifyToken, usersController.toggleTwoFactor);
router.post('/2fa/verify', verifyToken, usersController.verifyTwoFactorOtp);
router.post('/2fa/verify-login', usersController.verifyTwoFactorLogin);
router.post('/revoke-sessions', verifyToken, usersController.revokeAllSessions);

// Profile picture / Avatar upload with multer in memory
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPG, PNG, WEBP, GIF, HEIC) are allowed'), false);
        }
    }
});

const handleUploadMiddleware = (req, res, next) => {
    upload.fields([
        { name: 'picture', maxCount: 1 },
        { name: 'avatar', maxCount: 1 },
        { name: 'file', maxCount: 1 },
        { name: 'image', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return sendError(res, 'File size too large. Maximum allowed size is 5MB.', null, 400);
            }
            return sendError(res, err.message || 'File upload error', null, 400);
        }
        if (req.files) {
            req.file = (req.files.picture && req.files.picture[0]) ||
                       (req.files.avatar && req.files.avatar[0]) ||
                       (req.files.image && req.files.image[0]) ||
                       (req.files.file && req.files.file[0]) ||
                       null;
        }
        next();
    });
};

// Profile management with real-time sync
router.get('/profile', verifyToken, (req, res) => {
    req.params.userId = req.userKey;
    return usersController.getUserById(req, res);
});
router.put('/profile', verifyToken, usersController.updateProfile);
router.patch('/profile', verifyToken, usersController.updateProfile);
router.post('/profile', verifyToken, usersController.updateProfile);

// S3 Profile picture upload & removal
router.post('/profile/picture', verifyToken, handleUploadMiddleware, usersController.uploadProfilePicture);
router.post('/profile/avatar-upload', verifyToken, handleUploadMiddleware, usersController.uploadProfilePicture);
router.delete('/profile/picture', verifyToken, usersController.removeProfilePicture);

router.get('/:userId', verifyToken, userMiddleware.validateUserId, usersController.getUserById);
router.post('/login', userMiddleware.checkLogin, usersController.validateLogin);
router.post('/google-login', usersController.googleLogin);
router.post('/registerUser', userMiddleware.validateNewUser, usersController.createUser);
router.post('/registerTempUser', userMiddleware.validateNewTempUser, usersController.createTempUser);
router.post('/check-registered', usersController.checkRegisteredUser);
router.get('/check-registered', usersController.checkRegisteredUser);
router.put('/:userId', verifyToken, userMiddleware.validateUserId, usersController.updateUser);
router.patch('/:userId', verifyToken, userMiddleware.validateUserId, usersController.updateUser);
router.delete('/:userId', verifyToken, userMiddleware.validateUserId, usersController.deleteUser);
router.post("/sendOtp", userMiddleware.validateOtpReq, usersController.sendOTP);

module.exports = router;


