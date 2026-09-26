const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response.util');

function verifyAdminAccessToken(token) {
    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('Admin JWT secret is not configured');

    const payload = jwt.verify(token, secret);
    if (payload.type !== 'access' || !payload.email || !payload.sub) {
        throw new Error('Invalid admin access token');
    }
    return payload;
}

function adminAuth(req, res, next) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return sendError(res, 'Admin authentication required', null, 401);

    try {
        req.admin = verifyAdminAccessToken(token);
        return next();
    } catch (error) {
        return sendError(res, 'Admin access token expired or invalid', error, 401);
    }
}

module.exports = { adminAuth, verifyAdminAccessToken };