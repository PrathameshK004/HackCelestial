const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
// Import utilities
const User = require('../modules/user.module.js');
const { pool } = require('../utils/db.util');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/mail.util');
const { generateOTP, generate2FAOTP, hashOTP, verifyOTP, isOTPExpired, getOTPExpiry } = require('../utils/otp.util');
const { createToken, createRefreshToken, verifyRefreshToken } = require('../utils/jwt.util');
const { verifyPassword } = require('../utils/verify.util');
const { sendSuccess, sendError } = require('../utils/response.util');
const { saveUserPushToken, removeUserPushToken } = require('../utils/notification.util');
const { uploadProfilePictureToS3, deleteS3Object, isS3Configured } = require('../utils/s3.util');

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
    googleLogin,
    registerPushToken,
    unregisterPushToken,
    toggleTwoFactor,
    verifyTwoFactorOtp,
    verifyTwoFactorLogin,
    revokeAllSessions,
    uploadProfilePicture,
    removeProfilePicture
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
        const is2FA = purpose && (
            purpose.toLowerCase().includes('2fa') ||
            purpose.toLowerCase().includes('two-factor')
        );
        const otp = is2FA ? generate2FAOTP() : generateOTP();
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

        console.log(`[OTP Dispatched] To: ${cleanEmail} | Purpose: ${purpose || "Verification"} | Code: ${otp}`);
        
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
    let userId = req.params.userId || req.userKey;

    if (!userId) {
        return sendError(res, "User ID is required", null, 400);
    }

    try {
        let user = await User.findById(userId);

        if (!user) {
            return sendError(res, "User not found", null, 404);
        }

        const safeUser = {
            id: user._id,
            userId: user._id,
            name: user.username,
            username: user.username,
            email: user.emailId,
            emailId: user.emailId,
            phone: user.phone || null,
            upiId: user.upiId || null,
            avatar: user.avatar || null,
            travelStyle: user.travelStyle || 'Boutique',
            currency: user.currency || 'INR',
            dob: user.dob || null,
            twoFactorEnabled: Boolean(user.twoFactorEnabled),
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

        console.log(`[Registration OTP Dispatched] To: ${emailId} | Code: ${otp}`);

        // 5. Response to client with fallback OTP
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

    if (!userId) {
        return sendError(res, "User ID is required", null, 400);
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return sendError(res, "User not found", null, 404);
        }

        // 1. Name / Username update (supports 'name', 'username', 'fullName')
        const rawName = req.body.name !== undefined 
            ? req.body.name 
            : (req.body.username !== undefined ? req.body.username : req.body.fullName);

        if (rawName !== undefined) {
            if (typeof rawName !== 'string' || !rawName.trim()) {
                return sendError(res, "Name cannot be empty", null, 400);
            }
            const trimmedName = rawName.trim();
            if (trimmedName.length > 100) {
                return sendError(res, "Name cannot exceed 100 characters", null, 400);
            }
            user.username = trimmedName;
        }

        // 2. UPI ID update (supports 'upiId', 'upi_id', 'uiId', 'ui_id')
        const rawUpiId = req.body.upiId !== undefined 
            ? req.body.upiId 
            : (req.body.upi_id !== undefined 
                ? req.body.upi_id 
                : (req.body.uiId !== undefined ? req.body.uiId : req.body.ui_id));

        if (rawUpiId !== undefined) {
            if (rawUpiId === null || (typeof rawUpiId === 'string' && !rawUpiId.trim())) {
                user.upiId = null;
            } else {
                const trimmedUpi = String(rawUpiId).trim();
                if (trimmedUpi.length > 255) {
                    return sendError(res, "UPI ID cannot exceed 255 characters", null, 400);
                }
                user.upiId = trimmedUpi;
            }
        }

        // 3. Phone number update (supports 'phone', 'phoneNumber', 'phone_number')
        const rawPhone = req.body.phone !== undefined 
            ? req.body.phone 
            : (req.body.phoneNumber !== undefined ? req.body.phoneNumber : req.body.phone_number);

        if (rawPhone !== undefined) {
            if (rawPhone === null || (typeof rawPhone === 'string' && !rawPhone.trim())) {
                user.phone = null;
            } else {
                const trimmedPhone = String(rawPhone).trim();
                if (trimmedPhone.length > 50) {
                    return sendError(res, "Phone number cannot exceed 50 characters", null, 400);
                }
                user.phone = trimmedPhone;
            }
        }

        // 4. DOB (Date of Birth) update (supports 'dob', 'dateOfBirth', 'date_of_birth')
        const rawDob = req.body.dob !== undefined 
            ? req.body.dob 
            : (req.body.dateOfBirth !== undefined ? req.body.dateOfBirth : req.body.date_of_birth);

        if (rawDob !== undefined) {
            if (rawDob === null || (typeof rawDob === 'string' && !rawDob.trim())) {
                user.dob = null;
            } else {
                user.dob = String(rawDob).trim().slice(0, 20);
            }
        }

        // 5. Optional extra profile attributes
        if (req.body.avatar !== undefined) {
            user.avatar = req.body.avatar ? String(req.body.avatar).trim() : null;
        }
        const rawTravelStyle = req.body.travelStyle !== undefined ? req.body.travelStyle : req.body.travel_style;
        if (rawTravelStyle !== undefined) {
            user.travelStyle = rawTravelStyle || 'Boutique';
        }
        if (req.body.currency !== undefined) {
            user.currency = req.body.currency || 'INR';
        }

        // 6. Persist directly to PostgreSQL users table
        const updateResult = await pool.query(
            `UPDATE users 
             SET username = $1, 
                 phone = $2, 
                 upi_id = $3, 
                 avatar = $4, 
                 travel_style = $5, 
                 currency = $6, 
                 dob = $7,
                 is_temp = FALSE,
                 updated_at = NOW()
             WHERE id = $8
             RETURNING *`,
            [
                user.username,
                user.phone,
                user.upiId,
                user.avatar,
                user.travelStyle,
                user.currency,
                user.dob !== undefined ? user.dob : null,
                user._id
            ]
        );

        const updatedRow = updateResult.rows[0];
        if (updatedRow) {
            user.updatedAt = updatedRow.updated_at;
        }

        // 7. Real-time synchronization across all trip groups the user is member of:
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
            name: user.username,
            username: user.username,
            email: user.emailId,
            emailId: user.emailId,
            phone: user.phone || null,
            upiId: user.upiId || null,
            avatar: user.avatar || null,
            travelStyle: user.travelStyle || 'Boutique',
            currency: user.currency || 'INR',
            dob: user.dob || null,
            twoFactorEnabled: Boolean(updatedRow ? updatedRow.two_factor_enabled : user.twoFactorEnabled),
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
    const { currentPassword, newPassword, code } = req.body;

    if ((!currentPassword && !code) || !newPassword) {
        return sendError(res, "Verification code and new password are required", null, 400);
    }

    if (newPassword.length < 6) {
        return sendError(res, "New password must be at least 6 characters long", null, 400);
    }

    if (currentPassword === newPassword) {
        return sendError(res, "New password must be different from current password", null, 400);
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return sendError(res, "User not found", null, 404);
        }

        if (code) {
            if (isOTPExpired(user.codeExpiry)) {
                return sendError(res, "Verification code has expired. Please request a new one.", null, 400);
            }
            const isValidCode = await verifyOTP(String(code).trim(), user.code);
            if (!isValidCode) {
                return sendError(res, "Invalid verification code. Please check your email.", null, 400);
            }
        } else {
            const isMatch = await verifyPassword(currentPassword, user.password);
            if (!isMatch) {
                return sendError(res, "Incorrect current password. Please try again.", null, 400);
            }
        }

        // Set and hash new password
        user.password = newPassword;
        user.code = null;
        user.codeExpiry = null;
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

        // Check if Two-Factor Authentication is enabled for user
        if (user.twoFactorEnabled) {
            const otp = generate2FAOTP();
            const expiry = getOTPExpiry();
            const hashedCode = await hashOTP(otp);

            await pool.query('UPDATE users SET code_hash = $1, code_expiry = $2, updated_at = NOW() WHERE id = $3', [hashedCode, expiry, user._id]);

            sendOTPEmail(user.emailId, otp, user.username, "2FA Security Login").catch((e) =>
                console.error('[2FA Login Email Error]', e.message)
            );

            console.log(`[2FA Login OTP Dispatched] To: ${user.emailId} | Code: ${otp}`);

            return sendSuccess(res, "Two-Factor Authentication required. 6-digit verification code sent to your email.", {
                twoFactorRequired: true,
                emailId: user.emailId,
                expiresIn: 300,
            });
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
            dob: user.dob || null,
            twoFactorEnabled: Boolean(user.twoFactorEnabled),
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
        const { credential, accessToken } = req.body || {};
        const clientId = process.env.GOOGLE_CLIENT_ID;

        if (!credential && !accessToken) {
            return sendError(res, 'Google authentication token is missing', null, 400);
        }

        let emailId = null;
        let name = null;
        let avatar = null;

        if (credential) {
            if (!clientId) {
                return sendError(res, 'Google sign-in is not configured on server', null, 503);
            }
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: clientId
            });
            const payload = ticket.getPayload();
            if (payload?.email && payload.email_verified === true) {
                emailId = payload.email.toLowerCase();
                name = payload.name;
                avatar = payload.picture;
            }
        } else if (accessToken) {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userInfoRes.ok) {
                const info = await userInfoRes.json();
                if (info?.email && (info.email_verified === true || info.email_verified === 'true')) {
                    emailId = info.email.toLowerCase();
                    name = info.name;
                    avatar = info.picture;
                }
            }
        }

        if (!emailId) {
            return sendError(res, 'Google account email could not be verified', null, 401);
        }

        let user = await User.findOne({ emailId });
        if (!user) {
            user = await User.create({
                username: name || emailId.split('@')[0],
                emailId,
                avatar: avatar || null,
                password: crypto.randomBytes(32).toString('hex'),
                isTemp: false
            });
        } else if (user.isTemp) {
            user.isTemp = false;
            user.username = name || user.username;
            if (avatar && !user.avatar) user.avatar = avatar;
            await user.save();
        }

        const token = createToken(user._id);
        const refreshToken = createRefreshToken(user._id);
        await storeRefreshToken(user._id, refreshToken);
        setAuthCookies(res, token, refreshToken);

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
            dob: user.dob || null,
            accessToken: token,
            refreshToken
        });
    } catch (error) {
        console.error('Google Login Error:', error.message);
        return sendError(res, 'Google sign-in failed: ' + (error.message || 'Verification error'), error, 401);
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

/**
 * Register / Update FCM push notification token for authenticated user
 */
async function registerPushToken(req, res) {
    try {
        const userId = req.userKey;
        const { token, deviceType = 'mobile' } = req.body;

        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }
        if (!token || !String(token).trim()) {
            return sendError(res, "Push token is required", null, 400);
        }

        const success = await saveUserPushToken(userId, String(token).trim(), deviceType);
        if (!success) {
            return sendError(res, "Failed to save push token", null, 500);
        }

        return sendSuccess(res, "Push token registered successfully", { 
            token: String(token).trim(), 
            deviceType 
        });
    } catch (err) {
        console.error("Register push token error:", err.message);
        return sendError(res, "Failed to register push token", err, 500);
    }
}

/**
 * Unregister / Remove FCM push notification token
 */
async function unregisterPushToken(req, res) {
    try {
        const userId = req.userKey;
        const { token } = req.body;

        if (!userId) {
            return sendError(res, "Authentication required", null, 401);
        }

        await removeUserPushToken(userId, token);
        return sendSuccess(res, "Push token removed successfully");
    } catch (err) {
        console.error("Unregister push token error:", err.message);
        return sendError(res, "Failed to unregister push token", err, 500);
    }
}

/**
 * Toggle 2FA state directly (On/Off) for authenticated user
 */
async function toggleTwoFactor(req, res) {
    try {
        const userId = req.userKey;
        if (!userId) return sendError(res, "Unauthorized", null, 401);

        const { enable } = req.body;
        const newStatus = enable !== undefined ? Boolean(enable) : true;

        await pool.query('UPDATE users SET two_factor_enabled = $1, updated_at = NOW() WHERE id = $2', [newStatus, userId]);

        const message = newStatus
            ? "Two-Factor Authentication enabled. Next login will require 6-digit email OTP verification."
            : "Two-Factor Authentication disabled.";

        return sendSuccess(res, message, { twoFactorEnabled: newStatus });
    } catch (err) {
        console.error("Toggle 2FA error:", err.message);
        return sendError(res, "Failed to update Two-Factor Authentication setting", err, 500);
    }
}

/**
 * Complete 2FA login verification with 6-digit OTP code
 */
async function verifyTwoFactorLogin(req, res) {
    try {
        const emailId = (req.body.emailId || req.body.email || '').trim().toLowerCase();
        const code = (req.body.code || '').toString().trim();

        if (!emailId || !code) {
            return sendError(res, "Email and 2FA verification code are required", null, 400);
        }

        const user = await User.findOne({ emailId });
        if (!user || user.isTemp) {
            return sendError(res, "User not found", null, 404);
        }

        if (isOTPExpired(user.codeExpiry)) {
            return sendError(res, "2FA verification code has expired. Please log in again to receive a new code.", null, 400);
        }

        const isValid = await verifyOTP(code, user.code);
        if (!isValid) {
            return sendError(res, "Invalid 2FA verification code. Please check your email.", null, 400);
        }

        // 2FA OTP is valid: clear code and issue login tokens!
        await pool.query('UPDATE users SET code_hash = NULL, code_expiry = NULL, updated_at = NOW() WHERE id = $1', [user._id]);

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
            dob: user.dob || null,
            twoFactorEnabled: true,
            accessToken: token,
            refreshToken: refreshToken
        };

        return sendSuccess(res, "2FA login verification successful! Welcome back.", responseData);
    } catch (error) {
        console.error("Verify 2FA Login Error:", error.message);
        return sendError(res, "Failed to verify 2FA code", error, 500);
    }
}

/**
 * Verify 2FA OTP code to activate 2FA
 */
async function verifyTwoFactorOtp(req, res) {
    try {
        const userId = req.userKey;
        const { code } = req.body;

        if (!userId || !code) return sendError(res, "Verification code is required", null, 400);

        const userRes = await pool.query('SELECT id, code_hash, code_expiry FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return sendError(res, "User not found", null, 404);

        const user = userRes.rows[0];

        if (isOTPExpired(user.code_expiry)) {
            return sendError(res, "Verification code expired. Please request a new code.", null, 400);
        }

        const isValid = await verifyOTP(String(code).trim(), user.code_hash);
        if (!isValid) {
            return sendError(res, "Invalid 2FA verification code.", null, 400);
        }

        // Enable 2FA & clear OTP code
        await pool.query('UPDATE users SET two_factor_enabled = TRUE, code_hash = NULL, code_expiry = NULL, updated_at = NOW() WHERE id = $1', [userId]);

        return sendSuccess(res, "Two-Factor Authentication enabled successfully!", { twoFactorEnabled: true });
    } catch (err) {
        console.error("Verify 2FA OTP error:", err.message);
        return sendError(res, "Failed to verify 2FA code", err, 500);
    }
}

/**
 * Revoke all active refresh sessions for security / logout all devices
 */
async function revokeAllSessions(req, res) {
    try {
        const userId = req.userKey;
        if (!userId) return sendError(res, "Unauthorized", null, 401);

        await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
        return sendSuccess(res, "All active sessions revoked successfully. Please log in again.");
    } catch (err) {
        console.error("Revoke sessions error:", err.message);
        return sendError(res, "Failed to revoke active sessions", err, 500);
    }
}

/**
 * Upload profile picture to AWS S3 and persist URL in users database
 */
async function uploadProfilePicture(req, res) {
    const userId = req.userKey;
    if (!userId) {
        return sendError(res, "Unauthorized", null, 401);
    }

    if (!req.file) {
        return sendError(res, "No image file provided. Please attach an image file with key 'picture' or 'avatar'.", null, 400);
    }

    try {
        if (!isS3Configured()) {
            return sendError(
                res,
                "AWS S3 is not configured on the server. Please add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME to your Backend/.env file.",
                null,
                503
            );
        }

        // Fetch current user to check for existing S3 avatar to replace
        const userRes = await pool.query('SELECT avatar, username FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return sendError(res, "User not found", null, 404);
        }

        const oldAvatar = userRes.rows[0].avatar;

        // Upload new picture to S3
        const { url: avatarUrl } = await uploadProfilePictureToS3({
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname,
            userId,
        });

        // Persist avatar URL into database
        const updateRes = await pool.query(
            `UPDATE users 
             SET avatar = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING id, username, email_id, phone, upi_id, avatar, travel_style, currency, dob, two_factor_enabled`,
            [avatarUrl, userId]
        );

        const updatedUser = updateRes.rows[0];

        // Best effort clean up old S3 image if it exists
        if (oldAvatar && (oldAvatar.includes('amazonaws.com') || oldAvatar.includes('profile-pictures/'))) {
            deleteS3Object(oldAvatar).catch((err) => {
                console.warn('Warning: Could not remove old S3 profile picture:', err.message);
            });
        }

        // Sync avatar with group member records
        try {
            const { syncUserWithGroups } = require('./invite.controller');
            if (typeof syncUserWithGroups === 'function') {
                syncUserWithGroups(userId, updatedUser.username, avatarUrl).catch(() => {});
            }
        } catch (_) {}

        return sendSuccess(res, "Profile picture uploaded successfully to S3", {
            avatar: avatarUrl,
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                emailId: updatedUser.email_id,
                avatar: updatedUser.avatar,
                phone: updatedUser.phone,
                upiId: updatedUser.upi_id,
                travelStyle: updatedUser.travel_style,
                currency: updatedUser.currency,
                dob: updatedUser.dob,
                twoFactorEnabled: updatedUser.two_factor_enabled
            }
        });
    } catch (err) {
        console.error("Upload profile picture error:", err);
        return sendError(res, err.message || "Failed to upload profile picture", null, 500);
    }
}

/**
 * Remove profile picture (resets avatar to null)
 */
async function removeProfilePicture(req, res) {
    const userId = req.userKey;
    if (!userId) {
        return sendError(res, "Unauthorized", null, 401);
    }

    try {
        const userRes = await pool.query('SELECT avatar FROM users WHERE id = $1', [userId]);
        const oldAvatar = userRes.rows.length > 0 ? userRes.rows[0].avatar : null;

        await pool.query('UPDATE users SET avatar = NULL, updated_at = NOW() WHERE id = $1', [userId]);

        if (oldAvatar && (oldAvatar.includes('amazonaws.com') || oldAvatar.includes('profile-pictures/'))) {
            deleteS3Object(oldAvatar).catch(() => {});
        }

        return sendSuccess(res, "Profile picture removed successfully", { avatar: null });
    } catch (err) {
        console.error("Remove profile picture error:", err);
        return sendError(res, "Failed to remove profile picture", err, 500);
    }
}



