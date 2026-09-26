const WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 120;
const store = new Map();

function rateLimit({ windowMs = WINDOW_MS, maxRequests = DEFAULT_LIMIT } = {}) {
  return (req, res, next) => {
    const key = req.userKey ? `auth:${req.userKey}` : `anon:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
    const now = Date.now();
    const bucket = store.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    if (bucket.count >= maxRequests) {
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        err: { message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        message: 'Rate limit exceeded',
        data: null,
        statusCode: 429
      });
    }

    bucket.count += 1;
    store.set(key, bucket);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));
    next();
  };
}

module.exports = { rateLimit };
