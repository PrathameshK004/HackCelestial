const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const verifyToken = require('../middleware/auth.middleware');
const { verifyToken: verifyJWT } = require('../utils/jwt.util');
const User = require('../modules/user.module.js');

const optionalVerifyToken = async (req, res, next) => {
    const token = req.cookies?.accessToken || req.cookies?.jwt || req.headers['authorization']?.split(' ')[1] || req.query?.token;
    if (token) {
        try {
            const decoded = verifyJWT(token);
            if (decoded?.key) {
                const user = await User.findById(decoded.key);
                if (user) {
                    req.userKey = user._id;
                }
            }
        } catch (e) {
            // Soft fail for optional auth
        }
    }
    next();
};

router.get('/', optionalVerifyToken, notificationController.getUserNotifications);
router.post('/read', verifyToken, notificationController.markNotificationAsRead);
router.delete('/clear-all', verifyToken, notificationController.clearAllNotifications);
router.delete('/:id', verifyToken, notificationController.deleteNotification);

module.exports = router;
