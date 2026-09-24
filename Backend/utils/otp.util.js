/**
 * OTP Utility Functions
 * Handles robust OTP generation and verification
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * Generate a random OTP using cryptographically secure random numbers
 * @param {number} digits - Number of digits (default: 4, for 2FA: 6)
 * @returns {number} Generated OTP
 */
const generateOTP = (digits = 4) => {
    if (digits === 6) {
        return crypto.randomInt(100000, 1000000);
    }
    return crypto.randomInt(1000, 10000);
};

/**
 * Generate a random 6-digit OTP specifically for Two-Factor Authentication (2FA)
 * @returns {number} Generated 6-digit OTP
 */
const generate2FAOTP = () => {
    return crypto.randomInt(100000, 1000000);
};

/**
 * Hash the OTP before storing in database using fast salt rounds (8)
 * for ephemeral verification codes.
 * @param {number|string} otp - OTP to hash
 * @returns {Promise<string>} Hashed OTP
 */
const hashOTP = async (otp) => {
    try {
        return await bcrypt.hash(otp.toString().trim(), 8);
    } catch (error) {
        console.error("OTP Hashing Error:", error.message);
        throw error;
    }
};

/**
 * Verify OTP against hashed OTP
 * @param {number|string} plainOTP - Plain text OTP provided by user
 * @param {string} hashedOTP - Hashed OTP stored in database
 * @returns {Promise<boolean>} True if OTP matches, false otherwise
 */
const verifyOTP = async (plainOTP, hashedOTP) => {
    try {
        if (!plainOTP || !hashedOTP) {
            return false;
        }
        const cleanPlainOTP = plainOTP.toString().trim();
        return await bcrypt.compare(cleanPlainOTP, hashedOTP);
    } catch (error) {
        console.error("OTP Verification Error:", error.message);
        return false;
    }
};

/**
 * Check if OTP has expired (safe for Date object, string, or number)
 * @param {Date|string|number} expiryTime - OTP expiry timestamp
 * @returns {boolean} True if OTP is expired, false otherwise
 */
const isOTPExpired = (expiryTime) => {
    if (!expiryTime) return true;
    const expiryMs = expiryTime instanceof Date ? expiryTime.getTime() : new Date(expiryTime).getTime();
    if (isNaN(expiryMs)) return true;
    return expiryMs < Date.now();
};

/**
 * Get OTP expiry time (5 minutes validity matching email template)
 * @returns {Date} Expiry timestamp
 */
const getOTPExpiry = () => {
    return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
};

module.exports = {
    generateOTP,
    generate2FAOTP,
    hashOTP,
    verifyOTP,
    isOTPExpired,
    getOTPExpiry
};
