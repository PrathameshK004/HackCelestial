const jwt = require('jsonwebtoken');

function authenticateSupportAdmin(req, res, next) {
    const authorization = req.headers.authorization || '';
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(503).json({ success: false, error: 'Support admin authentication is unavailable' });
    }

    try {
        const payload = jwt.verify(tokenMatch[1], secret, { algorithms: ['HS256'] });
        if (payload.type !== 'access' || typeof payload.sub !== 'string' || !payload.sub) {
            return res.status(403).json({ success: false, error: 'Support admin access required' });
        }

        req.admin = { id: payload.sub, email: payload.email };
        return next();
    } catch {
        return res.status(401).json({ success: false, error: 'Access token expired or invalid' });
    }
}

module.exports = authenticateSupportAdmin;