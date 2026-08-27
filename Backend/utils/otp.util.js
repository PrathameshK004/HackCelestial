/**
 * OTP Utility Functions
 * Handles robust OTP generation and verification
 */

const bcrypt = require('bcrypt');

/**
 * Generate a random 4-digit OTP
 * @returns {number} Generated OTP
 */
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000);
};

/**
 * Hash the OTP before storing in database
 * @param {number|string} otp - OTP to hash
 * @returns {Promise<string>} Hashed OTP
 */
const hashOTP = async (otp) => {
    try {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(otp.toString().trim(), salt);
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
 * Get OTP expiry time (10 minutes validity for industry-standard grace period)
 * @returns {Date} Expiry timestamp
 */
const getOTPExpiry = () => {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

module.exports = {
    generateOTP,
    hashOTP,
    verifyOTP,
    isOTPExpired,
    getOTPExpiry
};
