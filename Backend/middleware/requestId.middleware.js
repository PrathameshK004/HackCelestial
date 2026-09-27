const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.locals.requestId = requestId;

  const startedAt = Date.now();
  res.once('finish', () => {
    console.info('[request]', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.userKey || null
    });
  });

  next();
}

module.exports = requestIdMiddleware;
