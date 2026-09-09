const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
// Import utilities
const User = require('../modules/user.module.js');
const { pool } = require('../utils/db.util');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/mail.util');
const { generateOTP, hashOTP, verifyOTP, isOTPExpired, getOTPExpiry } = require('../utils/otp.util');
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
    updateProfile,
    changePassword,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
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
 * Send OTP to user's email (resend OTP / general OTP)
 * Fast 1-query update and non-blocking email delivery
 */
async function sendOTP(req, res) {
    try {
        const { emailId, purpose } = req.body;
        const cleanEmail = (emailId || '').trim().toLowerCase();

        if (!cleanEmail) {
            return sendError(res, "Email is required", null, 400);
        }

        const userResult = await pool.query(
            'SELECT id, username, email_id FROM users WHERE LOWER(email_id) = $1 LIMIT 1',
            [cleanEmail]
        );

        if (userResult.rows.length === 0) {
            return sendError(res, "User not found", null, 404);
        }

        const user = userResult.rows[0];
        const otp = generateOTP();
        const expiry = getOTPExpiry();
        const hashedCode = await hashOTP(otp);

        // Targeted 1-query update
        await pool.query(
            'UPDATE users SET code_hash = $1, code_expiry = $2, updated_at = NOW() WHERE id = $3',
            [hashedCode, expiry, user.id]
        );

        // Send OTP email in background
        sendOTPEmail(cleanEmail, otp, user.username, purpose || "Verification").catch((emailErr) => {
            console.error(`[Background Email Error] Failed sending OTP to ${cleanEmail}:`, emailErr.message);
        });
        
        return sendSuccess(res, "OTP sent successfully", {
            emailId: cleanEmail,
            otp,
            expiresIn: 300
        });
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

        const safeUser = {
            id: user._id,
            userId: user._id,
            username: user.username,
            emailId: user.emailId,
            phone: user.phone || null,
            upiId: user.upiId || null,
            avatar: user.avatar || null,
            travelStyle: user.travelStyle || 'Boutique',
            currency: user.currency || 'INR',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        return sendSuccess(res, "User fetched successfully", safeUser);
    } catch (err) {
        console.error("Internal server error:", err.message);
        return sendError(res, "Internal Server Error", err, 500);
    }
}

/**
 * Complete Registration and Activate Account after OTP verification
 * Gated strictly by valid OTP: profile is NOT activated without verifying code.
 */
async function createUser(req, res) {
    try {
        const username = (req.body.username || '').trim();
        const emailId = (req.body.emailId || '').trim().toLowerCase();
        const password = req.body.password;
        const code = (req.body.code || '').toString().trim();

        if (!username || !emailId || !password || !code) {
            return sendError(res, "Username, email, password, and OTP code are required", null, 400);
        }

        // 1. Look up pending registration
        const existingResult = await pool.query(
            'SELECT id, username, email_id, password_hash, is_temp, code_hash, code_expiry FROM users WHERE LOWER(email_id) = $1 LIMIT 1',
            [emailId]
        );

        if (existingResult.rows.length === 0) {
            return sendError(res, "No pending registration found for this email. Please sign up first.", null, 404);
        }

        const existingUser = existingResult.rows[0];

        // 2. If user is already permanently active
        if (!existingUser.is_temp) {
            return sendError(res, "Account is already verified and active. Please sign in.", null, 400);
        }

        // 3. Validate OTP Expiry
        if (isOTPExpired(existingUser.code_expiry)) {
            return sendError(res, "Verification code has expired. Please click 'Resend Code'.", null, 400);
        }

        // 4. Strictly verify OTP code
        const isCodeValid = await verifyOTP(code, existingUser.code_hash);
        if (!isCodeValid) {
            return sendError(res, "Invalid verification code. Please check your email and try again.", null, 400);
        }

        // 5. OTP is VALID: Only now activate the profile permanently (is_temp = false)
        const passwordHash = password ? await bcrypt.hash(String(password), 10) : existingUser.password_hash;
        const userRow = await pool.query(`
            UPDATE users SET
                username = $1,
                password_hash = $2,
                is_temp = FALSE,
                code_hash = NULL,
                code_expiry = NULL,
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, username, email_id, phone, upi_id, avatar, travel_style, currency
        `, [username, passwordHash, existingUser.id]);

        const savedUser = userRow.rows[0];

        // 6. Issue authentication tokens (Instant Login upon verification)
        const token = createToken(savedUser.id);
        const refreshToken = createRefreshToken(savedUser.id);
        await storeRefreshToken(savedUser.id, refreshToken);
        if (typeof res.cookie === 'function') {
            setAuthCookies(res, token, refreshToken);
        }

        // 7. Background welcome email (non-blocking)
        sendWelcomeEmail(emailId, username).catch((mailErr) => {
            console.warn(`[Welcome Email Warning] ${mailErr.message}`);
        });

        const responseData = {
            userId: savedUser.id,
            id: savedUser.id,
            username: savedUser.username,
            emailId: savedUser.email_id,
            phone: savedUser.phone || null,
            upiId: savedUser.upi_id || null,
            avatar: savedUser.avatar || null,
            travelStyle: savedUser.travel_style || 'Boutique',
            currency: savedUser.currency || 'INR',
            accessToken: token,
            refreshToken: refreshToken
        };

        return sendSuccess(res, "Account verified and created successfully", responseData, 201);
    } catch (error) {
        console.error("Create User Error:", error.message);
        return sendError(res, error.message || "Internal server error", error, 500);
    }
}


/**
 * Create temporary user (initial registration step)
 * Optimized for high-speed registration flow (<250ms):
 * - Single DB query to check permanent account conflict
 * - Parallel bcrypt hashing of password (rounds 10) and ephemeral OTP (rounds 8)
 * - Single atomic UPSERT
 * - Asynchronous background email delivery
 */
async function createTempUser(req, res) {
    try {
        const username = (req.body.username || '').trim();
        const emailId = (req.body.emailId || '').trim().toLowerCase();
        const password = req.body.password;

        if (!username || !emailId || !password) {
            return sendError(res, "Username, email, and password are required", null, 400);
        }

        // 1. Single-query check: Does a permanent (registered) account already exist with this email?
        const existingResult = await pool.query(
            'SELECT id, is_temp FROM users WHERE LOWER(email_id) = $1 LIMIT 1',
            [emailId]
        );

        if (existingResult.rows.length > 0 && !existingResult.rows[0].is_temp) {
            return sendError(res, "User already exists", null, 400);
        }

        const userId = existingResult.rows.length > 0 ? existingResult.rows[0].id : crypto.randomUUID();
        const otp = generateOTP();
        const expiry = getOTPExpiry();

        // 2. Parallel hashing: hash password (cost 10) and OTP (cost 8) concurrently
        const [passwordHash, codeHash] = await Promise.all([
            bcrypt.hash(String(password), 10),
            hashOTP(otp)
        ]);

        // 3. Atomic UPSERT: Single DB operation to store temp user credentials and OTP
        await pool.query(`
            INSERT INTO users (id, username, email_id, password_hash, is_temp, code_hash, code_expiry, updated_at)
            VALUES ($1, $2, $3, $4, TRUE, $5, $6, NOW())
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                email_id = EXCLUDED.email_id,
                password_hash = EXCLUDED.password_hash,
                is_temp = TRUE,
                code_hash = EXCLUDED.code_hash,
                code_expiry = EXCLUDED.code_expiry,
                updated_at = NOW()
        `, [userId, username, emailId, passwordHash, codeHash, expiry]);

        // 4. Background non-blocking email dispatch (pooled direct SMTP or Keep-Alive HTTP fallback)
        sendOTPEmail(emailId, otp, username, "Sign Up").catch((emailErr) => {
            console.error(`[Background Email Error] Failed sending OTP to ${emailId}:`, emailErr.message);
        });

        // 5. Immediate response to client (<250ms) with OTP for rapid completion (<30s flow)
        return sendSuccess(res, "Temporary user created and OTP sent", { 
            emailId,
            otp,
            expiresIn: 300 
        }, 200);
    } catch (error) {
        console.error("Error creating temp user:", error);
        return sendError(res, "Internal Server Error", error, 500);
    }
}

/**
 * Update user profile information (Full Name, Phone, UPI ID, Avatar, Travel Style, Currency)
 * Automatically synchronizes changes to group_members ledger in real-time.
 */
async function updateProfile(req, res) {
    const userId = req.userKey || req.params.userId;
    const { username, phone, upiId, avatar, travelStyle, currency } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user || user.isTemp) {
            return sendError(res, "User not found", null, 404);
        }

        if (username && username.trim()) {
            user.username = username.trim();
        }
        if (phone !== undefined) {
            user.phone = phone ? phone.trim() : null;
        }
        if (upiId !== undefined) {
            user.upiId = upiId ? upiId.trim() : null;
        }
        if (avatar !== undefined) {
            user.avatar = avatar || null;
        }
        if (travelStyle !== undefined) {
            user.travelStyle = travelStyle || 'Boutique';
        }
        if (currency !== undefined) {
            user.currency = currency || 'INR';
        }

        await user.save();

        // Real-time synchronization across all groups the user is part of:
        try {
            await pool.query(
                `UPDATE group_members 
                 SET name = $1, upi_id = $2 
                 WHERE user_id = $3 OR LOWER(email) = LOWER($4)`,
                [user.username, user.upiId || null, user._id, user.emailId]
            );
        } catch (syncErr) {
            console.warn("Group member profile sync warning:", syncErr.message);
        }

        const safeUser = {
            id: user._id,
            userId: user._id,
            username: user.username,
            emailId: user.emailId,
            phone: user.phone || null,
            upiId: user.upiId || null,
            avatar: user.avatar || null,
            travelStyle: user.travelStyle || 'Boutique',
            currency: user.currency || 'INR',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        return sendSuccess(res, "Profile updated successfully", safeUser);
    } catch (err) {
        console.error("Update Profile Error:", err);
        return sendError(res, "Internal server error updating profile", err, 500);
    }
}

/**
 * Update user information (supports both /profile and /:userId routes)
 */
async function updateUser(req, res) {
    return updateProfile(req, res);
}

/**
 * Change user password while authenticated
 */
async function changePassword(req, res) {
    const userId = req.userKey || req.params.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return sendError(res, "Current password and new password are required", null, 400);
    }

    if (newPassword.length < 6) {
        return sendError(res, "New password must be at least 6 characters long", null, 400);
    }

    if (currentPassword === newPassword) {
        return sendError(res, "New password must be different from current password", null, 400);
    }

    try {
        const user = await User.findById(userId);

        if (!user || user.isTemp) {
            return sendError(res, "User not found", null, 404);
        }

        const isMatch = await verifyPassword(currentPassword, user.password);
        if (!isMatch) {
            return sendError(res, "Incorrect current password. Please try again.", null, 400);
        }

        // Set and hash new password
        user.password = newPassword;
        await user.save();

        return sendSuccess(res, "Password updated successfully");
    } catch (err) {
        console.error("Change Password Error:", err);
        return sendError(res, "Internal server error changing password", err, 500);
    }
}

/**
 * Request password reset OTP
 * Single query lookup and background email dispatch
 */
async function forgotPassword(req, res) {
    const emailId = (req.body.emailId || req.body.email || '').trim().toLowerCase();

    if (!emailId) {
        return sendError(res, "Email address is required", null, 400);
    }

    try {
        const userResult = await pool.query(
            'SELECT id, username, email_id, is_temp FROM users WHERE LOWER(email_id) = $1 LIMIT 1',
            [emailId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].is_temp) {
            return sendError(res, "No registered account found with this email address.", null, 404);
        }

        const user = userResult.rows[0];
        const otp = generateOTP();
        const expiry = getOTPExpiry();
        const hashedCode = await hashOTP(otp);

        // Targeted 1-query update
        await pool.query(
            'UPDATE users SET code_hash = $1, code_expiry = $2, updated_at = NOW() WHERE id = $3',
            [hashedCode, expiry, user.id]
        );

        sendOTPEmail(emailId, otp, user.username, "Password Reset").catch((emailErr) => {
            console.error(`[Background Email Error] Failed sending password reset OTP to ${emailId}:`, emailErr.message);
        });

        return sendSuccess(res, "Verification code sent to your email for password reset.", {
            emailId: user.email_id,
            otp,
            expiresIn: 300
        });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        return sendError(res, "Failed to process forgot password request", err, 500);
    }
}

/**
 * Verify OTP entered for password reset
 */
async function verifyResetOtp(req, res) {
    const emailId = (req.body.emailId || req.body.email || '').trim().toLowerCase();
    const code = (req.body.code || '').toString().trim();

    if (!emailId || !code) {
        return sendError(res, "Email and OTP code are required", null, 400);
    }

    try {
        const user = await User.findOne({ emailId });

        if (!user || user.isTemp) {
            return sendError(res, "User not found", null, 404);
        }

        if (isOTPExpired(user.codeExpiry)) {
            return sendError(res, "Verification code has expired. Please request a new one.", null, 400);
        }

        const isValid = await verifyOTP(code, user.code);
        if (!isValid) {
            return sendError(res, "Invalid verification code. Please check your email.", null, 400);
        }

        return sendSuccess(res, "Code verified successfully", {
            emailId: user.emailId,
            verified: true
        });
    } catch (err) {
        console.error("Verify Reset OTP Error:", err);
        return sendError(res, "Error verifying OTP", err, 500);
    }
}

/**
 * Reset password using verified OTP code
 */
async function resetPassword(req, res) {
    const emailId = (req.body.emailId || req.body.email || '').trim().toLowerCase();
    const code = (req.body.code || '').toString().trim();
    const newPassword = req.body.newPassword;

    if (!emailId || !code || !newPassword) {
        return sendError(res, "Email, OTP code, and new password are required", null, 400);
    }

    if (newPassword.length < 6) {
        return sendError(res, "New password must be at least 6 characters long", null, 400);
    }

    try {
        const user = await User.findOne({ emailId });

        if (!user || user.isTemp) {
            return sendError(res, "User not found", null, 404);
        }

        if (isOTPExpired(user.codeExpiry)) {
            return sendError(res, "Verification code has expired. Please request a new one.", null, 400);
        }

        const isValid = await verifyOTP(code, user.code);
        if (!isValid) {
            return sendError(res, "Invalid verification code. Please check your latest email.", null, 400);
        }

        // Set and hash new password, clear code
        user.password = newPassword;
        user.code = null;
        user.codeExpiry = null;
        await user.save();

        // Invalidate active refresh tokens for security
        await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [user._id]);

        return sendSuccess(res, "Password reset successfully! You can now log in with your new password.");
    } catch (err) {
        console.error("Reset Password Error:", err);
        return sendError(res, "Failed to reset password", err, 500);
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
            id: user._id,
            username: user.username,
            emailId: user.emailId,
            phone: user.phone || null,
            upiId: user.upiId || null,
            avatar: user.avatar || null,
            travelStyle: user.travelStyle || 'Boutique',
            currency: user.currency || 'INR',
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
            id: user._id,
            username: user.username,
            emailId: user.emailId,
            phone: user.phone || null,
            upiId: user.upiId || null,
            avatar: user.avatar || null,
            travelStyle: user.travelStyle || 'Boutique',
            currency: user.currency || 'INR',
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


