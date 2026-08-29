
let express = require("express");
let router = express.Router();
let usersController = require('../controllers/user.controller');
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
router.get('/:userId', verifyToken, userMiddleware.validateUserId, usersController.getUserById);
router.post('/login', userMiddleware.checkLogin, usersController.validateLogin);
router.post('/google-auth', usersController.googleAuth);
router.post('/registerUser', userMiddleware.validateNewUser, usersController.createUser);
router.post('/registerTempUser', userMiddleware.validateNewTempUser, usersController.createTempUser);
router.post('/check-registered', usersController.checkRegisteredUser);
router.get('/check-registered', usersController.checkRegisteredUser);
router.put('/:userId', verifyToken, userMiddleware.validateUserId, userMiddleware.validateUpdateUser, usersController.updateUser);
router.delete('/:userId', verifyToken, userMiddleware.validateUserId, usersController.deleteUser);
router.post("/sendOtp", userMiddleware.validateOtpReq, usersController.sendOTP);
router.post("/forgotPassword", userMiddleware.validateForgotPassword, usersController.forgotPassword);
router.post("/verifyResetOtp", userMiddleware.validateVerifyResetOtp, usersController.verifyResetOtp);
router.post("/resetPassword", userMiddleware.validateResetPassword, usersController.resetPassword);
router.put("/changePassword", verifyToken, userMiddleware.validateChangePassword, usersController.changePassword);

module.exports = router;


