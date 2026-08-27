/**
 * JWT Utility Functions
 * Handles JWT token creation and verification
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Create access JWT
 * @param {string} userId - User ID to encode in token
 * @param {string} expiresIn - Token expiration time (default: 7 days)
 * @returns {string} Generated JWT token
 */
const createToken = (userId, expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m') => {
    try {
        return jwt.sign({ key: userId }, process.env.JWTSecret, {
            expiresIn,
            subject: 'access'
        });
    } catch (error) {
        console.error("Token Creation Error:", error.message);
        throw error;
    }
};

const createRefreshToken = (userId) => {
    try {
        return jwt.sign({ key: userId }, process.env.REFRESH_TOKEN_SECRET || process.env.JWTSecret, {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
            subject: 'refresh'
        });
    } catch (error) {
        console.error("Refresh Token Creation Error:", error.message);
        throw error;
    }
};

/**
 * Verify JWT Token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWTSecret, { subject: 'access' });
    } catch (error) {
        console.error("Token Verification Error:", error.message);
        throw error;
    }
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.JWTSecret, {
        subject: 'refresh'
    });
};

/**
 * Extract User ID from JWT token
 * @param {string} token - JWT token
 * @returns {string} User ID
 */
const getUserIdFromToken = (token) => {
    try {
        const decoded = verifyToken(token);
        return decoded.key;
    } catch (error) {
        console.error("Extract User ID Error:", error.message);
        throw error;
    }
};

module.exports = {
    createToken,
    createRefreshToken,
    verifyToken,
    verifyRefreshToken,
    getUserIdFromToken
};
