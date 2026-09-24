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
router.post('/mark-read', verifyToken, notificationController.markNotificationAsRead);
router.delete('/clear-all', verifyToken, notificationController.clearAllNotifications);
router.delete('/clear', verifyToken, notificationController.clearAllNotifications);
router.delete('/:id', verifyToken, notificationController.deleteNotification);

// Test endpoint to verify real-time Socket.io delivery
router.post('/test', verifyToken, async (req, res) => {
    try {
        const { createInAppNotification } = require('../utils/notification.util');
        const userId = req.userKey;
        const title = req.body?.title || '⚡ Real-Time Notification Test';
        const body = req.body?.body || 'Socket.io event mesh connected successfully!';
        const data = req.body?.data || { test: true, timestamp: Date.now() };

        const notifId = await createInAppNotification(userId, {
            type: 'SYSTEM_ALERT',
            title,
            body,
            data
        });

        return res.json({ success: true, message: 'Test notification emitted successfully', notificationId: notifId });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Global Admin Broadcast HTTP endpoints
const handleBroadcastRequest = async (req, res) => {
    try {
        const { createBroadcastNotification } = require('../utils/notification.util');
        const title = req.body?.title || req.body?.subject || 'Admin Announcement 📢';
        const body = req.body?.body || req.body?.message || req.body?.content || 'New system announcement';
        const type = req.body?.type || 'ANNOUNCEMENT';
        const data = req.body?.data || {};

        const notifId = await createBroadcastNotification({ type, title, body, data });
        return res.json({
            success: true,
            message: 'Broadcast notification dispatched successfully to all users',
            data: { id: notifId, title, body, type }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

router.post('/broadcast', handleBroadcastRequest);
router.post('/admin/broadcast', handleBroadcastRequest);
router.post('/send', async (req, res) => {
    const { userId, title, body, message, type, data } = req.body;
    if (userId && userId !== 'ALL' && userId !== 'all') {
        const { createInAppNotification } = require('../utils/notification.util');
        const notifId = await createInAppNotification(userId, {
            type: type || 'SYSTEM_ALERT',
            title: title || 'Notification',
            body: body || message || '',
            data: data || {}
        });
        return res.json({ success: true, notificationId: notifId });
    }
    return handleBroadcastRequest(req, res);
});

module.exports = router;
