const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
// Import utilities
const User = require('../modules/user.module.js');
const { pool } = require('../utils/db.util');
const { sendOTPEmail } = require('../utils/mail.util');
const { generateOTP, verifyOTP, isOTPExpired, getOTPExpiry } = require('../utils/otp.util');
const { createToken, createRefreshToken, verifyRefreshToken } = require('../utils/jwt.util');
const { verifyPassword } = require('../utils/verify.util');
const { sendSuccess, sendError } = require('../utils/response.util');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

require('dotenv').config();

module.exports = {
    sendOTP,
    validateLogin,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    logoutUser,
    refreshAccessToken,
    createTempUser,
    checkRegisteredUser,
    googleLogin
};

/**
 * Check if a user is registered on the platform
 */
async function checkRegisteredUser(req, res) {
    try {
        const query = (req.body.email || req.body.emailId || req.body.username || req.query.email || req.query.query || '').toString().trim().toLowerCase();

        if (!query) {
            return sendError(res, "Email or username is required", null, 400);
        }

        const result = await pool.query(
            `SELECT id, username, email_id, is_temp FROM users 
             WHERE (LOWER(email_id) = $1 OR LOWER(username) = $1) AND is_temp = FALSE 
             LIMIT 1`,
            [query]
        );

        if (result.rows.length > 0) {
            const row = result.rows[0];
            return sendSuccess(res, "User found on platform", {
                exists: true,
                isRegistered: true,
                user: {
                    id: row.id,
                    username: row.username,
                    email: row.email_id,
                }
            });
        }

        return sendSuccess(res, "User not registered on platform", {
            exists: false,
            isRegistered: false,
            user: null
        });
    } catch (error) {
        console.error("Check Registered User Error:", error.message);
        return sendError(res, "Error checking user registration", error, 500);
    }
}

/**
 * Send OTP to user's email
 */
async function sendOTP(req, res) {
    try {
        const { emailId, purpose } = req.body;
        const user = await User.findOne({ emailId });

        if (!user) {
            return sendError(res, "User not found", null, 404);
        }

        const otp = generateOTP();
        user.code = otp;
        user.codeExpiry = getOTPExpiry();
        await user.save();

        // Send OTP email
        await sendOTPEmail(emailId, otp, user.username, purpose);
        
        return sendSuccess(res, "OTP sent successfully");
    } catch (error) {
        console.error("OTP Error:", error.message);
        return sendError(res, "Internal Server Error", error, 500);
    }
}

/**
 * Get user by ID
 */
async function getUserById(req, res) {
    let userId = req.params.userId;

    try {
        let user = await User.findById(userId);

        if (!user || user.isTemp) {
            return sendError(res, "User not found", null, 404);
        }

        return sendSuccess(res, "User fetched successfully", user);
    } catch (err) {
        console.error("Internal server error:", err.message);
        return sendError(res, "Internal Server Error", err, 500);
    }
}

/**
 * Create user after OTP verification
 */
async function createUser(req, res) {
    try {
        const username = (req.body.username || '').trim();
        const emailId = (req.body.emailId || '').trim().toLowerCase();
        const password = req.body.password;
        const code = (req.body.code || '').toString().trim();

        const tempUser = await User.findOne({ emailId: emailId });

        if (!tempUser) {
            return sendError(res, "User not found. Please sign up again.", null, 404);
        }

        // If user is already permanent and verified
        if (!tempUser.isTemp) {
            return sendSuccess(res, "User already verified", {
                userId: tempUser._id,
                username: tempUser.username,
                emailId: tempUser.emailId
            }, 200);
        }

        // Validate OTP expiry
        if (isOTPExpired(tempUser.codeExpiry)) {
            return sendError(res, "OTP expired. Please click 'Resend Verification Code'.", null, 400);
        }

        // Verify OTP
        const isCodeValid = await verifyOTP(code, tempUser.code);
        if (!isCodeValid) {
            return sendError(res, "Invalid OTP. Please check your latest email and try again.", null, 400);
        }

        // OTP is correct, mark user permanent & active
        tempUser.code = null;
        tempUser.codeExpiry = null;
        tempUser.isTemp = false;
        if (username) tempUser.username = username;
        if (password) tempUser.password = password;
        await tempUser.save();

        const responseData = {
            userId: tempUser._id,
            username: tempUser.username,
            emailId: tempUser.emailId
        };

        return sendSuccess(res, "Account verified successfully", responseData, 201);
    } catch (error) {
        console.error("Create User Error:", error.message);
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return sendError(res, "Validation error occurred", { errors: errorMessages }, 400);
        }
        return sendError(res, error.message || "Internal server error", error, 500);
    }
}


/**
 * Create temporary user (initial registration step)
 */
async function createTempUser(req, res) {
    try {
        let tempUser;
        const { username, emailId, password } = req.body;

        try {
            const existingUser = await User.findOne({ emailId: emailId });
            if (existingUser && !existingUser.isTemp) {
                return sendError(res, "User already exists", null, 400);
            }
            if (existingUser && existingUser.isTemp) {
                tempUser = existingUser;
            }
        } catch (err) {
            return sendError(res, "Error checking for existing user", err, 500);
        }

        // If no temporary user exists, create a new one
        if (!tempUser) {
            tempUser = await User.create({ username, emailId, password });
            tempUser.isTemp = true;
            await tempUser.save();
        } else {
            tempUser.username = username;
            tempUser.password = password;
        }

        // Send OTP to the user's email
        if (tempUser) {
            try {
                const otp = generateOTP();
                tempUser.code = otp;
                tempUser.codeExpiry = getOTPExpiry();
                await tempUser.save();

                await sendOTPEmail(tempUser.emailId, otp, tempUser.username, "Sign Up");
                
                return sendSuccess(res, "Temporary user created and OTP sent", null, 200);
            } catch (emailError) {
                console.error("Error sending OTP email:", emailError);
                return sendError(res, "User created but failed to send OTP", emailError, 500);
            }
        } else {
            return sendError(res, "Failed to create temporary user", null, 400);
        }
    } catch (error) {
        console.error("Error creating temp user:", error);
        return sendError(res, "Internal Server Error", error, 500);
    }
}

/**
 * Update user information
 */
async function updateUser(req, res) {
    const userId = req.params.userId;
    const updatedUserData = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return sendError(res, "User not found", null, 404);
        }

        user.username = updatedUserData.username || user.username;
        user.emailId = updatedUserData.emailId || user.emailId;

        await user.save();

        return sendSuccess(res, "User updated successfully", user);
    } catch (err) {
        console.error(err);
        return sendError(res, "Internal server error", err, 500);
    }
}

/**
 * Delete user
 */
async function deleteUser(req, res) {
    const userId = req.params.userId;

    try {
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return sendError(res, "User not found", null, 404);
        }

        return sendSuccess(res, "User deleted successfully", null, 204);
    } catch (err) {
        console.error("Error deleting user:", err);
        return sendError(res, "Internal server error", err, 500);
    }
}

/**
 * Validate login with email and password
 */
async function validateLogin(req, res) {
    try {
        const { emailId, password } = req.body;
        const user = await User.findOne({ emailId });

        if (!user) {
            return sendError(res, "User not found", null, 404);
        }

        if (user.isTemp) {
            return sendError(res, "User not found", null, 404);
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return sendError(res, "Invalid Password. Please try again.", null, 400);
        }

        const token = createToken(user._id);
        const refreshToken = createRefreshToken(user._id);
        await storeRefreshToken(user._id, refreshToken);
        
        setAuthCookies(res, token, refreshToken);

        const responseData = {
            userId: user._id,
            username: user.username,
            accessToken: token,
            refreshToken: refreshToken
        };

        return sendSuccess(res, "Login successful", responseData);
    } catch (error) {
        console.error("Login Error:", error.message);
        return sendError(res, "Internal Server Error", error, 500);
    }
}

/**
 * Verify a Google Identity Services credential and create or sign in the user.
 */
async function googleLogin(req, res) {
    try {
        const credential = req.body?.credential;
        const clientId = process.env.GOOGLE_CLIENT_ID;

        if (!credential || !clientId) {
            return sendError(res, 'Google sign-in is not configured', null, 503);
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: clientId
        });
        const payload = ticket.getPayload();

        if (!payload?.email || payload.email_verified !== true) {
            return sendError(res, 'Google account email could not be verified', null, 401);
        }

        const emailId = payload.email.toLowerCase();
        let user = await User.findOne({ emailId });
        if (!user) {
            user = await User.create({
                username: payload.name || emailId.split('@')[0],
                emailId,
                password: crypto.randomBytes(32).toString('hex'),
                isTemp: false
            });
        } else if (user.isTemp) {
            user.isTemp = false;
            user.username = payload.name || user.username;
            await user.save();
        }

        const accessToken = createToken(user._id);
        const refreshToken = createRefreshToken(user._id);
        await storeRefreshToken(user._id, refreshToken);
        setAuthCookies(res, accessToken, refreshToken);

        return sendSuccess(res, 'Google login successful', {
            userId: user._id,
            username: user.username,
            emailId: user.emailId,
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Google Login Error:', error.message);
        return sendError(res, 'Google sign-in failed', error, 401);
    }
}

async function refreshAccessToken(req, res) {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        return sendError(res, 'Refresh token is required', { code: 'REFRESH_TOKEN_REQUIRED' }, 401);
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);
        const tokenHash = hashToken(refreshToken);

        // 1. Atomically consume the single-use refresh token
        const result = await pool.query(`
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
            RETURNING id
        `, [tokenHash, decoded.key]);

        if (!result.rows[0]) {
            // 2. Concurrency Grace Period: If rotated within the last 30s, accommodate parallel requests
            const recentRevocation = await pool.query(`
                SELECT id FROM refresh_tokens
                WHERE token_hash = $1 AND user_id = $2 AND revoked_at > NOW() - INTERVAL '30 seconds' AND expires_at > NOW()
                LIMIT 1
            `, [tokenHash, decoded.key]);

            if (recentRevocation.rows.length > 0) {
                const accessToken = createToken(decoded.key);
                return sendSuccess(res, 'Token refreshed successfully', { accessToken });
            }

            // 3. Security: Token reuse detected beyond grace period, revoke all active sessions for this user
            console.warn(`[Security Alert] Refresh token reuse detected for user ${decoded.key}. Revoking tokens.`);
            await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [decoded.key]);

            return sendError(res, 'Invalid or expired refresh token', { code: 'REFRESH_TOKEN_EXPIRED' }, 401);
        }

        // 4. Issue rotated token pair
        const accessToken = createToken(decoded.key);
        const nextRefreshToken = createRefreshToken(decoded.key);
        await storeRefreshToken(decoded.key, nextRefreshToken);
        setAuthCookies(res, accessToken, nextRefreshToken);

        return sendSuccess(res, 'Token refreshed successfully', { accessToken, refreshToken: nextRefreshToken });
    } catch (error) {
        if (error.name !== 'TokenExpiredError') {
            console.error('Refresh Token Error:', error.message);
        }
        return sendError(res, 'Invalid or expired refresh token', { code: 'REFRESH_TOKEN_EXPIRED' }, 401);
    }
}

async function storeRefreshToken(userId, refreshToken) {
    const expiresAt = new Date(Date.now() + parseDuration(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'));
    await pool.query(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
    `, [crypto.randomUUID(), userId, hashToken(refreshToken), expiresAt]);
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function parseDuration(value) {
    const match = /^([0-9]+)([smhd])$/.exec(value);
    if (!match) {
        return 7 * 24 * 60 * 60 * 1000;
    }
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return Number(match[1]) * units[match[2]];
}

function setAuthCookies(res, accessToken, refreshToken) {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
    };

    res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: parseDuration(process.env.ACCESS_TOKEN_EXPIRES_IN || '15m')
    });
    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        path: '/api/users',
        maxAge: parseDuration(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d')
    });
}

/**
 * Logout user and revoke the current refresh token.
 */
async function logoutUser(req, res) {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [hashToken(refreshToken)]);
    }

    res.clearCookie('accessToken');
    res.clearCookie('jwt');
    res.clearCookie('refreshToken', { path: '/api/users' });
    return sendSuccess(res, "Successfully logged out");
}


