const User = require('../modules/user.module.js');
const { verifyToken: verifyJWT } = require('../utils/jwt.util');
const { sendError, sendSuccess } = require('../utils/response.util');

const verifyToken = async (req, res, next) => {
    const token = req.cookies.accessToken || req.cookies.jwt || req.headers['authorization']?.split(' ')[1] || req.query.token || req.params.token;

    if (req.headers['test'] === process.env.TEST_TOKEN) {
        console.log("Static test token validated");
        return next(); // Bypass JWT verification for Postman testing
    }

    if (!token) {
        return sendError(res, 'No token provided, access denied!', null, 403);
    }

    try {
        // Verify the token
        const decoded = verifyJWT(token);
        let userId = decoded.key;

        let user = await User.findById(userId);

        if (!user) {
            return sendError(res, "User not found", null, 404);
        }

        req.userKey = user._id; 
        next(); 
    } catch (err) {
        console.error("Token verification error:", err.message);
        return sendError(res, 'Unauthorized!', err, 401);
    }
};

module.exports = verifyToken;
