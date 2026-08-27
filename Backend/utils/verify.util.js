/**
 * Verification Utility Functions
 * Handles password, email, and other verification operations
 */

const bcrypt = require('bcrypt');

/**
 * Verify password against hashed password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        console.error("Password Verification Error:", error.message);
        throw error;
    }
};

/**
 * Validate PostgreSQL UUID
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
const isValidUserId = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

/**
 * Validate Email Format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate Password Strength
 * Minimum 6 characters
 * @param {string} password - Password to validate
 * @returns {boolean} True if password meets requirements
 */
const isValidPassword = (password) => {
    return password && password.length >= 6;
};

/**
 * Validate Username
 * Minimum 3 characters
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid username
 */
const isValidUsername = (username) => {
    return username && username.length >= 3;
};

module.exports = {
    verifyPassword,
    isValidUserId,
    isValidEmail,
    isValidPassword,
    isValidUsername
};
