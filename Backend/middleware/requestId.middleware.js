const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.locals.requestId = requestId;

  console.info('[request]', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.userKey || null
  });

  next();
}

module.exports = requestIdMiddleware;
