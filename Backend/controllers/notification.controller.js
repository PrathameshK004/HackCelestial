const { pool } = require('../utils/db.util');
const { sendSuccess, sendError } = require('../utils/response.util');

module.exports = {
    getUserNotifications,
    markNotificationAsRead,
    deleteNotification,
    clearAllNotifications
};

/**
 * Get all in-app notifications for the authenticated or guest user
 * Retrieves both user-specific notifications and global admin broadcast notifications
 */
async function getUserNotifications(req, res) {
    try {
        const userId = req.userKey || null;

        const notifsRes = await pool.query(`
            SELECT id, type, title, body, data, is_read as "isRead", created_at as "createdAt"
            FROM in_app_notifications
            WHERE (user_id = $1 AND $1 IS NOT NULL) 
               OR user_id IS NULL 
               OR user_id = '00000000-0000-0000-0000-000000000000'
            ORDER BY created_at DESC
            LIMIT 100
        `, [userId]);

        return sendSuccess(res, "In-app notifications retrieved", notifsRes.rows);

    } catch (error) {
        console.error("Get User Notifications Error:", error);
        return sendError(res, "Failed to retrieve notifications", error, 500);
    }
}

/**
 * Mark a single notification or all notifications as read
 */
async function markNotificationAsRead(req, res) {
    try {
        const userId = req.userKey;
        const { notificationId, markAll = false } = req.body;

        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        if (markAll) {
            await pool.query('UPDATE in_app_notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
            return sendSuccess(res, "All notifications marked as read", { markAll: true });
        } else if (notificationId) {
            await pool.query('UPDATE in_app_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [notificationId, userId]);
            return sendSuccess(res, "Notification marked as read", { notificationId });
        } else {
            return sendError(res, "notificationId or markAll is required", null, 400);
        }

    } catch (error) {
        console.error("Mark Notification Read Error:", error);
        return sendError(res, "Failed to update notification status", error, 500);
    }
}

/**
 * Delete a specific notification
 */
async function deleteNotification(req, res) {
    try {
        const userId = req.userKey;
        const { id } = req.params;

        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        await pool.query('DELETE FROM in_app_notifications WHERE id = $1 AND user_id = $2', [id, userId]);
        return sendSuccess(res, "Notification deleted", { id });

    } catch (error) {
        console.error("Delete Notification Error:", error);
        return sendError(res, "Failed to delete notification", error, 500);
    }
}

/**
 * Clear all notifications for user
 */
async function clearAllNotifications(req, res) {
    try {
        const userId = req.userKey;
        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        await pool.query('DELETE FROM in_app_notifications WHERE user_id = $1', [userId]);
        return sendSuccess(res, "All notifications cleared", { success: true });

    } catch (error) {
        console.error("Clear All Notifications Error:", error);
        return sendError(res, "Failed to clear notifications", error, 500);
    }
}
