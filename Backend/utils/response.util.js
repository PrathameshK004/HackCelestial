/**
 * Standard Response Format Utility
 * Used to return consistent response structure across the application
 */

const sendResponse = (res, statusCode, message, data = null, error = null) => {
    const response = {
        err: error || {},
        message,
        data,
        statusCode
    };

    return res.status(statusCode).json(response);
};

const sendSuccess = (res, message, data = null, statusCode = 200) => {
    return sendResponse(res, statusCode, message, data, null);
};

const sendError = (res, message, error = null, statusCode = 500) => {
    const errorObj = error
        ? {
            message: error.message || message,
            ...(error.code ? { code: error.code } : {}),
            ...(error.errors ? { errors: error.errors } : {})
        }
        : { message };
    return sendResponse(res, statusCode, message, null, errorObj);
};

module.exports = {
    sendResponse,
    sendSuccess,
    sendError
};
