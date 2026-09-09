
const express = require('express');
const bodyParser = require('body-parser')
const User = require('../modules/user.module');
const validator = require('validator');

// Import verify utilities
const { isValidUserId, isValidEmail, isValidPassword, isValidUsername } = require('../utils/verify.util');
const { sendError } = require('../utils/response.util');

const app = express();
app.use(bodyParser.json());

module.exports = {
  checkLogin,
  validateUserId,
  validateNewUser,
  validateUpdateUser,
  validateOtpReq,
  validateNewTempUser
}

/**
 * Validate PostgreSQL UUID
 */
function validateUserId(req, res, next) {
  const userId = req.params.userId;
  
  if (!userId) {
    return sendError(res, 'User ID is required.', null, 400);
  }
  
  if (!isValidUserId(userId)) {
    return sendError(res, 'Invalid userId. Please provide a valid UUID.', null, 400);
  }
  
  next();
}

/**
 * Validate new user data for direct 1-step registration
 */
async function validateNewUser(req, res, next) {
  const { username, emailId, password } = req.body;

  // Check required fields
  if (!username || !emailId || !password) {
    return sendError(res, 'Username, Email and Password are required fields.', null, 400);
  }

  // Validate email format
  if (!isValidEmail(emailId)) {
    return sendError(res, 'Invalid email format.', null, 400);
  }

  // Validate password strength
  if (!isValidPassword(password)) {
    return sendError(res, 'Password must be at least 6 characters long.', null, 400);
  }

  // Validate username
  if (!isValidUsername(username)) {
    return sendError(res, 'Username must be at least 3 characters long.', null, 400);
  }

  try {
    const existingUser = await User.findOne({ emailId: emailId });
    if (existingUser && !existingUser.isTemp) {
      return sendError(res, 'An account with this email already exists.', null, 400);
    }
  } catch (err) {
    return sendError(res, 'Error checking for existing user.', err, 500);
  }

  next();
}

/**
 * Validate temporary user data (initial registration)
 */
async function validateNewTempUser(req, res, next) {
  const { username, emailId, password } = req.body;

  if (!username || !emailId || !password) {
    return sendError(res, 'Username, Email and Password are required fields.', null, 400);
  }

  if (!isValidEmail(emailId)) {
    return sendError(res, 'Invalid email format.', null, 400);
  }

  if (!isValidPassword(password)) {
    return sendError(res, 'Password must be at least 6 characters long.', null, 400);
  }

  if (!isValidUsername(username)) {
    return sendError(res, 'Username must be at least 3 characters long.', null, 400);
  }

  next();
}

/**
 * Validate user update data
 */
async function validateUpdateUser(req, res, next) {
  const { username, emailId } = req.body;

  if (emailId) {
    if (!isValidEmail(emailId)) {
      return sendError(res, 'Invalid email format.', null, 400);
    }

    const existingUser = await User.findOne({ emailId });
    if (existingUser && existingUser._id !== req.params.userId) {
      return sendError(res, 'Email already exists.', null, 400);
    }
  }

  if (username && !isValidUsername(username)) {
    return sendError(res, 'Username must be at least 3 characters long.', null, 400);
  }

  next();
}

/**
 * Validate login credentials
 */
function checkLogin(req, res, next) {
  const { emailId, password } = req.body;

  if (!password || !emailId) {
    return sendError(res, 'Email and Password are required fields.', null, 400);
  }

  if (!isValidEmail(emailId)) {
    return sendError(res, 'Invalid email format.', null, 400);
  }

  next();
}

/**
 * Validate OTP request
 */
function validateOtpReq(req, res, next) {
  const { emailId, purpose } = req.body;

  if (!emailId || !purpose) {
    return sendError(res, 'Both emailId and purpose are required fields.', null, 400);
  }

  if (!isValidEmail(emailId)) {
    return sendError(res, 'Invalid email format.', null, 400);
  }

  if (typeof purpose !== 'string') {
    return sendError(res, 'Purpose must be a string.', null, 400);
  }

  const validPurposes = ["Sign Up", "Forgot Password", "Password Reset", "Reset Password", "Verification"];
  if (!validPurposes.includes(purpose)) {
    return sendError(res, 'Invalid OTP purpose. Allowed purposes: "Sign Up", "Forgot Password", "Password Reset", "Verification".', null, 400);
  }

  next(); 
}
