const crypto = require('crypto');
const axios = require('axios');
// Import utilities
const User = require('../modules/user.module.js');
const { pool } = require('../utils/db.util');
const { sendOTPEmail } = require('../utils/mail.util');
const { generateOTP, verifyOTP, isOTPExpired, getOTPExpiry } = require('../utils/otp.util');
const { createToken, createRefreshToken, verifyRefreshToken } = require('../utils/jwt.util');
const { verifyPassword } = require('../utils/verify.util');
const { sendSuccess, sendError } = require('../utils/response.util');

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
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    changePassword,
    googleAuth
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
            `SELECT id, username, email_id, upi_id, is_temp FROM users 
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
                    upiId: row.upi_id,
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
        const upiId = (req.body.upiId || '').trim().toLowerCase();

        const tempUser = await User.findOne({ emailId: emailId });

        if (!tempUser) {
            return sendError(res, "User not found. Please sign up again.", null, 404);
        }

        // If user is already permanent and verified
        if (!tempUser.isTemp) {
            return sendSuccess(res, "User already verified", {
                userId: tempUser._id,
                username: tempUser.username,
                emailId: tempUser.emailId,
                upiId: tempUser.upiId
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
        tempUser.upiId = upiId;
        await tempUser.save();

        const responseData = {
            userId: tempUser._id,
            username: tempUser.username,
            emailId: tempUser.emailId,
            upiId: tempUser.upiId
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
        const { username, emailId, password, upiId } = req.body;

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
            tempUser.upiId = upiId;
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
        user.upiId = updatedUserData.upiId || user.upiId;

        await user.save();
        await pool.query('UPDATE group_members SET name = $1, upi_id = $2 WHERE user_id = $3', [user.username, user.upiId, user._id]);

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
            emailId: user.emailId,
            upiId: user.upiId,
            accessToken: token,
            refreshToken: refreshToken
        };

        return sendSuccess(res, "Login successful", responseData);
    } catch (error) {
        console.error("Login Error:", error.message);
        return sendError(res, "Internal Server Error", error, 500);
    }
}

async function refreshAccessToken(req, res) {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        return sendError(res, 'Refresh token is required', null, 401);
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);
        const tokenHash = hashToken(refreshToken);
        const result = await pool.query(`
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
            RETURNING id
        `, [tokenHash, decoded.key]);

        if (!result.rows[0]) {
            return sendError(res, 'Invalid or expired refresh token', null, 401);
        }

        const accessToken = createToken(decoded.key);
        const nextRefreshToken = createRefreshToken(decoded.key);
        await storeRefreshToken(decoded.key, nextRefreshToken);
        setAuthCookies(res, accessToken, nextRefreshToken);

        return sendSuccess(res, 'Token refreshed successfully', { accessToken, refreshToken: nextRefreshToken });
    } catch (error) {
        console.error('Refresh Token Error:', error.message);
        return sendError(res, 'Invalid or expired refresh token', null, 401);
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

/**
 * Handle Forgot Password (Generate OTP and send email)
 */
async function forgotPassword(req, res) {
    try {
        const emailId = (req.body.emailId || '').trim().toLowerCase();
        const user = await User.findOne({ emailId });

        if (!user || user.isTemp) {
            return sendError(res, "No active account found with this email address.", null, 404);
        }

        const otp = generateOTP();
        user.code = otp;
        user.codeExpiry = getOTPExpiry();
        await user.save();

        await sendOTPEmail(user.emailId, otp, user.username, "Password Reset");

        return sendSuccess(res, "Password reset OTP sent to your registered email.", {
            emailId: user.emailId
        });
    } catch (error) {
        console.error("Forgot Password Error:", error.message);
        return sendError(res, "Failed to process forgot password request", error, 500);
    }
}

/**
 * Verify OTP for Password Reset
 */
async function verifyResetOtp(req, res) {
    try {
        const emailId = (req.body.emailId || '').trim().toLowerCase();
        const code = (req.body.code || '').toString().trim();

        const user = await User.findOne({ emailId });
        if (!user || user.isTemp) {
            return sendError(res, "User not found.", null, 404);
        }

        if (isOTPExpired(user.codeExpiry)) {
            return sendError(res, "OTP has expired. Please click 'Resend Code'.", null, 400);
        }

        const isCodeValid = await verifyOTP(code, user.code);
        if (!isCodeValid) {
            return sendError(res, "Invalid OTP code. Please check your email and try again.", null, 400);
        }

        return sendSuccess(res, "OTP verified successfully. You may now create a new password.");
    } catch (error) {
        console.error("Verify Reset OTP Error:", error.message);
        return sendError(res, "Failed to verify OTP", error, 500);
    }
}

/**
 * Reset Password with OTP & New Password
 */
async function resetPassword(req, res) {
    try {
        const emailId = (req.body.emailId || '').trim().toLowerCase();
        const code = (req.body.code || '').toString().trim();
        const newPassword = req.body.newPassword;

        const user = await User.findOne({ emailId });
        if (!user || user.isTemp) {
            return sendError(res, "User not found.", null, 404);
        }

        if (isOTPExpired(user.codeExpiry)) {
            return sendError(res, "OTP has expired. Please click 'Resend Code'.", null, 400);
        }

        const isCodeValid = await verifyOTP(code, user.code);
        if (!isCodeValid) {
            return sendError(res, "Invalid OTP code. Please try again.", null, 400);
        }

        // Update password and clear OTP
        user.password = newPassword;
        user.code = null;
        user.codeExpiry = null;
        await user.save();

        // Revoke all existing refresh tokens for security
        await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [user._id]);

        return sendSuccess(res, "Password reset successfully. You can now log in with your new password.");
    } catch (error) {
        console.error("Reset Password Error:", error.message);
        return sendError(res, "Failed to reset password", error, 500);
    }
}

/**
 * Authenticated Change Password
 */
async function changePassword(req, res) {
    try {
        const userId = req.userKey;
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user || user.isTemp) {
            return sendError(res, "User not found.", null, 404);
        }

        const isPasswordValid = await verifyPassword(currentPassword, user.password);
        if (!isPasswordValid) {
            return sendError(res, "Current password is incorrect.", null, 400);
        }

        user.password = newPassword;
        await user.save();

        return sendSuccess(res, "Password updated successfully.");
    } catch (error) {
        console.error("Change Password Error:", error.message);
        return sendError(res, "Failed to change password", error, 500);
    }
}

/**
 * Handle Google OAuth / Google Sign-In authentication
 */
async function googleAuth(req, res) {
    try {
        const credential = req.body.credential || req.body.token || req.body.idToken;

        if (!credential) {
            return sendError(res, "Google credential / ID token is required", null, 400);
        }

        // Verify token with Google's tokeninfo API
        let googleUserData;
        try {
            const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
                timeout: 8000
            });
            googleUserData = googleRes.data;
        } catch (verifyErr) {
            console.error("Google token verification failed:", verifyErr.response?.data || verifyErr.message);
            return sendError(res, "Invalid or expired Google token. Please try signing in again.", null, 401);
        }

        const { email, name, sub, email_verified } = googleUserData;

        if (!email) {
            return sendError(res, "Unable to retrieve email from Google account", null, 400);
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        let user = await User.findOne({ emailId: normalizedEmail });

        if (user) {
            // If user existed as temp user, activate them
            if (user.isTemp) {
                user.isTemp = false;
                user.code = null;
                user.codeExpiry = null;
                if (!user.username && name) {
                    user.username = name.trim();
                }
                await user.save();
            }
        } else {
            // Automatically create new user for Google Sign-In
            const username = name ? name.trim() : normalizedEmail.split('@')[0];
            const randomPassword = crypto.randomBytes(32).toString('hex');

            user = await User.create({
                username,
                emailId: normalizedEmail,
                password: randomPassword,
                isTemp: false,
                upiId: null
            });
        }

        // Generate application JWT access and refresh tokens
        const token = createToken(user._id);
        const refreshToken = createRefreshToken(user._id);
        await storeRefreshToken(user._id, refreshToken);

        setAuthCookies(res, token, refreshToken);

        const responseData = {
            userId: user._id,
            username: user.username,
            emailId: user.emailId,
            upiId: user.upiId,
            accessToken: token,
            refreshToken: refreshToken
        };

        return sendSuccess(res, "Google Sign-In successful", responseData);
    } catch (error) {
        console.error("Google Auth Error:", error.message);
        return sendError(res, "Failed to authenticate with Google", error, 500);
    }
}




