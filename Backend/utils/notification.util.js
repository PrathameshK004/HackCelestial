const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('./db.util');

let firebaseAdmin = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK if credentials exist
 */
function getFirebaseAdmin() {
    if (isInitialized) {
        return firebaseAdmin;
    }

    try {
        const admin = require('firebase-admin');
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
            || path.join(__dirname, '..', 'firebase-service-account.json');

        if (fs.existsSync(serviceAccountPath)) {
            const rawContent = fs.readFileSync(serviceAccountPath, 'utf8').trim();
            if (rawContent) {
                const serviceAccount = JSON.parse(rawContent);
                
                // Initialize if no default app exists
                if (admin.apps.length === 0) {
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount)
                    });
                }
                firebaseAdmin = admin;
                isInitialized = true;
                console.log('Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
            } else {
                console.warn('Firebase service account file is empty. Push notifications disabled.');
            }
        } else {
            console.warn(`Firebase service account file not found at ${serviceAccountPath}. Push notifications disabled.`);
        }
    } catch (err) {
        console.warn('Firebase Admin SDK initialization skipped or failed:', err.message);
    }

    return firebaseAdmin;
}

/**
 * Save / Register a user device push token
 */
async function saveUserPushToken(userId, token, deviceType = 'mobile') {
    if (!userId || !token) return null;

    try {
        const cleanToken = String(token).trim();
        if (!cleanToken) return null;

        // Upsert into user_push_tokens
        const tokenId = crypto.randomUUID();
        await pool.query(`
            INSERT INTO user_push_tokens (id, user_id, token, device_type, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (user_id, token)
            DO UPDATE SET updated_at = NOW(), device_type = EXCLUDED.device_type
        `, [tokenId, userId, cleanToken, deviceType]);

        // Also update users.push_token
        await pool.query(`
            UPDATE users SET push_token = $1, updated_at = NOW() WHERE id = $2
        `, [cleanToken, userId]);

        return true;
    } catch (err) {
        console.error('Failed to save push token for user', userId, err.message);
        return false;
    }
}

/**
 * Remove a user device push token (e.g. on logout)
 */
async function removeUserPushToken(userId, token) {
    if (!userId) return false;

    try {
        if (token) {
            await pool.query('DELETE FROM user_push_tokens WHERE user_id = $1 AND token = $2', [userId, token.trim()]);
        } else {
            await pool.query('DELETE FROM user_push_tokens WHERE user_id = $1', [userId]);
        }
        await pool.query('UPDATE users SET push_token = NULL WHERE id = $1', [userId]);
        return true;
    } catch (err) {
        console.error('Failed to remove push token for user', userId, err.message);
        return false;
    }
}

/**
 * Prune stale / unregistered FCM tokens from database
 */
async function pruneInvalidTokens(invalidTokens) {
    if (!Array.isArray(invalidTokens) || invalidTokens.length === 0) return;
    try {
        await pool.query('DELETE FROM user_push_tokens WHERE token = ANY($1::text[])', [invalidTokens]);
        await pool.query('UPDATE users SET push_token = NULL WHERE push_token = ANY($1::text[])', [invalidTokens]);
    } catch (err) {
        console.warn('Error pruning invalid tokens:', err.message);
    }
}

/**
 * Fetch all push tokens registered for a specific user
 */
async function getTokensForUser(userId) {
    if (!userId) return [];
    try {
        const res = await pool.query(
            'SELECT token FROM user_push_tokens WHERE user_id = $1 ORDER BY updated_at DESC',
            [userId]
        );
        const tokens = res.rows.map(r => r.token).filter(Boolean);

        // Fallback to users table if not found in user_push_tokens
        if (tokens.length === 0) {
            const userRes = await pool.query('SELECT push_token FROM users WHERE id = $1', [userId]);
            if (userRes.rows[0]?.push_token) {
                tokens.push(userRes.rows[0].push_token);
            }
        }

        return Array.from(new Set(tokens));
    } catch (err) {
        console.error('Failed to get tokens for user', userId, err.message);
        return [];
    }
}

/**
 * Send a push notification payload to a list of tokens
 */
async function sendNotificationToTokens(tokens, { title, body, data = {} }) {
    if (!tokens || tokens.length === 0) return;

    const admin = getFirebaseAdmin();
    if (!admin) {
        console.log(`[Push Notification Skipped - FCM not initialized] Title: "${title}" | Body: "${body}"`);
        return;
    }

    // Stringify all values in data payload for FCM compatibility
    const formattedData = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
            formattedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
    }

    try {
        const response = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: {
                title,
                body
            },
            data: formattedData,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                    priority: 'high'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        });

        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const errorCode = resp.error?.code;
                if (
                    errorCode === 'messaging/invalid-registration-token' ||
                    errorCode === 'messaging/registration-token-not-registered'
                ) {
                    invalidTokens.push(tokens[idx]);
                } else {
                    console.warn(`FCM message error for token:`, resp.error?.message);
                }
            }
        });

        if (invalidTokens.length > 0) {
            pruneInvalidTokens(invalidTokens);
        }
    } catch (err) {
        console.error('Error sending push notification via FCM:', err.message);
    }
}

/**
 * Send push notification to a specific user by userId
 */
async function sendPushToUser(userId, { title, body, data = {} }) {
    if (!userId) return;
    try {
        const tokens = await getTokensForUser(userId);
        if (tokens.length > 0) {
            await sendNotificationToTokens(tokens, { title, body, data });
        }
    } catch (err) {
        console.error('Error sending push to user:', userId, err.message);
    }
}

/**
 * Send push notification to a user by email (if they have an account registered)
 */
async function sendPushToEmail(email, { title, body, data = {} }) {
    if (!email) return;
    try {
        const userRes = await pool.query(
            'SELECT id FROM users WHERE LOWER(email_id) = LOWER($1) LIMIT 1',
            [email.trim()]
        );
        if (userRes.rows.length > 0) {
            const userId = userRes.rows[0].id;
            await sendPushToUser(userId, { title, body, data });
        }
    } catch (err) {
        console.error('Error sending push to email:', email, err.message);
    }
}

/**
 * Helper to save a persistent in-app notification in DB
 */
async function createInAppNotification(userId, { type, title, body, data = {} }) {
    if (!userId) return null;
    try {
        const id = crypto.randomUUID();
        await pool.query(`
            INSERT INTO in_app_notifications (id, user_id, type, title, body, data, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())
        `, [id, userId, type, title, body, JSON.stringify(data)]);
        return id;
    } catch (err) {
        console.warn('Failed to insert in_app_notification for user', userId, err.message);
        return null;
    }
}

/**
 * High-level helper: Trigger notification for a Group Invitation (Push + Persistent In-App)
 */
async function sendGroupInviteNotification({ inviteeEmail, inviterName, groupName, groupId, inviteCode }) {
    try {
        const title = `Trip Invitation: ${groupName}`;
        const body = `${inviterName || 'A group member'} invited you to join "${groupName}"!`;
        const data = {
            type: 'GROUP_INVITE',
            groupId: String(groupId),
            inviteCode: String(inviteCode || ''),
            groupName: String(groupName),
            screen: 'InvitationScreen'
        };

        if (inviteeEmail) {
            const trimmed = inviteeEmail.trim().toLowerCase();
            const userRes = await pool.query('SELECT id FROM users WHERE LOWER(email_id) = $1 LIMIT 1', [trimmed]);
            if (userRes.rows.length > 0) {
                const inviteeUserId = userRes.rows[0].id;
                await createInAppNotification(inviteeUserId, { type: 'GROUP_INVITE', title, body, data });
                await sendPushToUser(inviteeUserId, { title, body, data });
            }
        }
    } catch (err) {
        console.warn('Failed to dispatch invite notification:', err.message);
    }
}

/**
 * High-level helper: Trigger notification when a member ACCEPTS an invitation
 */
async function sendInviteAcceptedNotification({ organizerUserId, memberName, groupName, groupId }) {
    try {
        if (!organizerUserId) return;
        const title = `Invitation Accepted!`;
        const body = `${memberName || 'A traveler'} accepted your invitation to join "${groupName}"!`;
        const data = {
            type: 'INVITE_ACCEPTED',
            groupId: String(groupId),
            groupName: String(groupName),
            screen: 'GroupDetailScreen'
        };

        await createInAppNotification(organizerUserId, { type: 'INVITE_ACCEPTED', title, body, data });
        await sendPushToUser(organizerUserId, { title, body, data });
    } catch (err) {
        console.warn('Failed to dispatch invite accepted notification:', err.message);
    }
}

/**
 * High-level helper: Trigger notification when a member REJECTS an invitation
 */
async function sendInviteRejectedNotification({ organizerUserId, memberName, groupName, groupId }) {
    try {
        if (!organizerUserId) return;
        const title = `Invitation Declined`;
        const body = `${memberName || 'A traveler'} declined your invitation to join "${groupName}".`;
        const data = {
            type: 'INVITE_REJECTED',
            groupId: String(groupId),
            groupName: String(groupName),
            screen: 'GroupDetailScreen'
        };

        await createInAppNotification(organizerUserId, { type: 'INVITE_REJECTED', title, body, data });
        await sendPushToUser(organizerUserId, { title, body, data });
    } catch (err) {
        console.warn('Failed to dispatch invite rejected notification:', err.message);
    }
}

/**
 * High-level helper: Trigger notifications for an Expense Added event
 */
async function sendExpenseNotification({
    groupId,
    groupName,
    payerName,
    payerUserId,
    description,
    totalAmount,
    currency = 'INR',
    splits = []
}) {
    try {
        // Fetch all group members with a registered user_id
        const membersRes = await pool.query(`
            SELECT gm.id as member_id, gm.user_id, gm.name, gm.email
            FROM group_members gm
            WHERE gm.group_id = $1 AND gm.user_id IS NOT NULL
        `, [groupId]);

        const currSymbol = currency === 'INR' ? '₹' : (currency + ' ');

        for (const member of membersRes.rows) {
            // Don't notify the person who paid / recorded the expense
            if (member.user_id && String(member.user_id) === String(payerUserId)) {
                continue;
            }

            // Check if this member is in the split
            const memberSplit = splits.find(
                s => String(s.memberId) === String(member.member_id) || (s.userId && String(s.userId) === String(member.user_id))
            );

            let body = '';
            if (memberSplit && Number(memberSplit.computedAmount) > 0) {
                const shareStr = `${currSymbol}${Math.round(Number(memberSplit.computedAmount))}`;
                body = `${payerName} added "${description}" (${currSymbol}${Math.round(totalAmount)}). Your share: ${shareStr}`;
            } else {
                body = `${payerName} added expense "${description}" (${currSymbol}${Math.round(totalAmount)})`;
            }

            const title = `New Expense in ${groupName}`;
            const data = {
                type: 'EXPENSE_ADDED',
                groupId: String(groupId),
                groupName: String(groupName),
                screen: 'GroupDetailScreen'
            };

            // Save persistent in-app notification & dispatch push notification
            createInAppNotification(member.user_id, { type: 'EXPENSE_ADDED', title, body, data }).catch(e =>
                console.warn(`Failed inserting in-app notification for user ${member.user_id}:`, e.message)
            );
            sendPushToUser(member.user_id, { title, body, data }).catch(e =>
                console.warn(`Failed sending expense push to user ${member.user_id}:`, e.message)
            );
        }
    } catch (err) {
        console.warn('Failed to dispatch expense push notifications:', err.message);
    }
}

module.exports = {
    getFirebaseAdmin,
    saveUserPushToken,
    removeUserPushToken,
    sendNotificationToTokens,
    sendPushToUser,
    sendPushToEmail,
    createInAppNotification,
    sendGroupInviteNotification,
    sendInviteAcceptedNotification,
    sendInviteRejectedNotification,
    sendExpenseNotification
};
